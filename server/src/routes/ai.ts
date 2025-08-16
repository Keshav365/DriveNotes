import express from 'express';
import { body, validationResult } from 'express-validator';
import { catchAsync } from '../middleware/errorHandler';
import { AIProviderFactory } from '../services/aiProviderService';
import { EncryptionService } from '../utils/encryption';
import { logger } from '../utils/logger';
import Note from '../models/Note';

const router = express.Router();

// Helper function to get AI provider for user
async function getUserAIProvider(user: any) {
  const aiSettings = user.aiSettings;
  
  if (!aiSettings.provider) {
    throw new Error('No AI provider configured');
  }
  
  const providerKey = aiSettings.apiKeys[aiSettings.provider];
  if (!providerKey || !providerKey.key) {
    throw new Error(`No API key configured for ${aiSettings.provider}`);
  }
  
  // Decrypt the API key
  const apiKey = providerKey.encrypted ? 
    EncryptionService.decrypt(providerKey.key) : 
    providerKey.key;
  
  const config = {
    provider: aiSettings.provider,
    apiKey,
    model: aiSettings.preferences.defaultModel,
    maxTokens: aiSettings.preferences.maxTokens,
    temperature: aiSettings.preferences.temperature,
  };
  
  return AIProviderFactory.createProvider(config);
}

// NEW ENDPOINT: Process content directly without requiring note ID
router.post('/process-content', [
  body('content').notEmpty().withMessage('Content is required'),
  body('aiFunction').isIn(['summarize', 'create-table', 'enhance', 'extract-actions', 'expand', 'format']).withMessage('Invalid AI function'),
  body('instructions').optional().isString().withMessage('Instructions must be a string'),
], catchAsync(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }

  const user = req.user!;
  const { content, aiFunction, instructions } = req.body;
  
  try {
    const aiProvider = await getUserAIProvider(user);
    
    let prompt = '';
    switch (aiFunction) {
      case 'summarize':
        prompt = `Please provide a concise summary of the following text:\n\n${content}`;
        break;
      case 'create-table':
        prompt = `Convert the following text into a well-formatted table using Markdown syntax:\n\n${content}`;
        if (instructions) prompt += `\n\nAdditional instructions: ${instructions}`;
        break;
      case 'enhance':
        prompt = `Improve the following text by fixing grammar, enhancing clarity, and making it more professional:\n\n${content}`;
        if (instructions) prompt += `\n\nAdditional instructions: ${instructions}`;
        break;
      case 'extract-actions':
        prompt = `Extract action items, tasks, and to-dos from the following text. Return them as a JSON array with objects containing 'task', 'priority' (high/medium/low), and 'deadline' (if mentioned). If no action items are found, return an empty array.\n\nText:\n${content}`;
        break;
      case 'expand':
        prompt = `Expand on the following text by adding more detail, context, and explanation:\n\n${content}`;
        if (instructions) prompt += `\n\nAdditional instructions: ${instructions}`;
        break;
      case 'format':
        prompt = `Format the following text with proper headings, bullet points, and structure using Markdown syntax:\n\n${content}`;
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid AI function',
        });
    }
    
    const response = await aiProvider.generateResponse(prompt);
    
    // Handle response based on function
    let result;
    switch (aiFunction) {
      case 'summarize':
        result = {
          summary: response.content,
          originalLength: content.length,
          summaryLength: response.content.length,
        };
        break;
      case 'create-table':
        result = {
          table: response.content,
          format: 'markdown',
        };
        break;
      case 'enhance':
        result = {
          enhancedContent: response.content,
        };
        break;
      case 'extract-actions':
        try {
          const actionItems = JSON.parse(response.content);
          result = {
            actionItems: Array.isArray(actionItems) ? actionItems : [],
          };
        } catch (parseError) {
          // Fallback for non-JSON responses
          result = {
            actionItems: [
              {
                task: response.content,
                priority: 'medium',
                deadline: null,
              },
            ],
          };
        }
        break;
      case 'expand':
        result = {
          expandedContent: response.content,
        };
        break;
      case 'format':
        result = {
          formattedContent: response.content,
        };
        break;
    }
    
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error(`AI process-content error (${aiFunction}):`, error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to process content with AI',
    });
  }
}));

// Summarize note content
router.post('/notes/:noteId/summarize', catchAsync(async (req, res) => {
  const user = req.user!;
  const { noteId } = req.params;
  
  // Get the note
  const note = await Note.findOne({ _id: noteId, userId: user._id });
  if (!note) {
    return res.status(404).json({
      success: false,
      message: 'Note not found',
    });
  }
  
  try {
    const aiProvider = await getUserAIProvider(user);
    
    const prompt = `Please provide a concise summary of the following text:\n\n${note.content}`;
    const response = await aiProvider.generateResponse(prompt);
    
    res.status(200).json({
      success: true,
      data: {
        summary: response.content,
        originalLength: note.content.length,
        summaryLength: response.content.length,
      },
    });
  } catch (error) {
    logger.error('AI summarize error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to summarize note',
    });
  }
}));

// Create table from note content
router.post('/notes/:noteId/create-table', catchAsync(async (req, res) => {
  const user = req.user!;
  const { noteId } = req.params;
  const { instructions } = req.body;
  
  const note = await Note.findOne({ _id: noteId, userId: user._id });
  if (!note) {
    return res.status(404).json({
      success: false,
      message: 'Note not found',
    });
  }
  
  try {
    const aiProvider = await getUserAIProvider(user);
    
    const basePrompt = `Convert the following text into a well-formatted table using Markdown syntax:\n\n${note.content}`;
    const prompt = instructions ? `${basePrompt}\n\nAdditional instructions: ${instructions}` : basePrompt;
    
    const response = await aiProvider.generateResponse(prompt);
    
    res.status(200).json({
      success: true,
      data: {
        table: response.content,
        format: 'markdown',
      },
    });
  } catch (error) {
    logger.error('AI create table error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create table',
    });
  }
}));

// Enhance note content
router.post('/notes/:noteId/enhance', catchAsync(async (req, res) => {
  const user = req.user!;
  const { noteId } = req.params;
  const { instructions } = req.body;
  
  const note = await Note.findOne({ _id: noteId, userId: user._id });
  if (!note) {
    return res.status(404).json({
      success: false,
      message: 'Note not found',
    });
  }
  
  try {
    const aiProvider = await getUserAIProvider(user);
    
    const basePrompt = `Improve the following text by fixing grammar, enhancing clarity, and making it more professional:\n\n${note.content}`;
    const prompt = instructions ? `${basePrompt}\n\nAdditional instructions: ${instructions}` : basePrompt;
    
    const response = await aiProvider.generateResponse(prompt);
    
    res.status(200).json({
      success: true,
      data: {
        enhancedContent: response.content,
      },
    });
  } catch (error) {
    logger.error('AI enhance error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to enhance content',
    });
  }
}));

// Extract action items
router.post('/notes/:noteId/extract-actions', catchAsync(async (req, res) => {
  const user = req.user!;
  const { noteId } = req.params;
  
  const note = await Note.findOne({ _id: noteId, userId: user._id });
  if (!note) {
    return res.status(404).json({
      success: false,
      message: 'Note not found',
    });
  }
  
  try {
    const aiProvider = await getUserAIProvider(user);
    
    const prompt = `Extract action items, tasks, and to-dos from the following text. Return them as a JSON array with objects containing 'task', 'priority' (high/medium/low), and 'deadline' (if mentioned). If no action items are found, return an empty array.\n\nText:\n${note.content}`;
    
    const response = await aiProvider.generateResponse(prompt);
    
    try {
      const actionItems = JSON.parse(response.content);
      res.status(200).json({
        success: true,
        data: {
          actionItems: Array.isArray(actionItems) ? actionItems : [],
        },
      });
    } catch (parseError) {
      // Fallback: parse manually or return structured text
      res.status(200).json({
        success: true,
        data: {
          actionItems: [
            {
              task: response.content,
              priority: 'medium',
              deadline: null,
            },
          ],
        },
      });
    }
  } catch (error) {
    logger.error('AI extract actions error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to extract action items',
    });
  }
}));

// Expand content
router.post('/notes/:noteId/expand', catchAsync(async (req, res) => {
  const user = req.user!;
  const { noteId } = req.params;
  const { instructions } = req.body;
  
  const note = await Note.findOne({ _id: noteId, userId: user._id });
  if (!note) {
    return res.status(404).json({
      success: false,
      message: 'Note not found',
    });
  }
  
  try {
    const aiProvider = await getUserAIProvider(user);
    
    const basePrompt = `Expand on the following text by adding more detail, context, and explanation:\n\n${note.content}`;
    const prompt = instructions ? `${basePrompt}\n\nAdditional instructions: ${instructions}` : basePrompt;
    
    const response = await aiProvider.generateResponse(prompt);
    
    res.status(200).json({
      success: true,
      data: {
        expandedContent: response.content,
      },
    });
  } catch (error) {
    logger.error('AI expand error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to expand content',
    });
  }
}));

// Format content
router.post('/notes/:noteId/format', catchAsync(async (req, res) => {
  const user = req.user!;
  const { noteId } = req.params;
  
  const note = await Note.findOne({ _id: noteId, userId: user._id });
  if (!note) {
    return res.status(404).json({
      success: false,
      message: 'Note not found',
    });
  }
  
  try {
    const aiProvider = await getUserAIProvider(user);
    
    const prompt = `Format the following text with proper headings, bullet points, and structure using Markdown syntax:\n\n${note.content}`;
    
    const response = await aiProvider.generateResponse(prompt);
    
    res.status(200).json({
      success: true,
      data: {
        formattedContent: response.content,
      },
    });
  } catch (error) {
    logger.error('AI format error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to format content',
    });
  }
}));

// Process with custom prompt
router.post('/notes/:noteId/process', [
  body('prompt').isLength({ min: 1 }).withMessage('Prompt is required'),
], catchAsync(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }
  
  const user = req.user!;
  const { noteId } = req.params;
  const { prompt: customPrompt } = req.body;
  
  const note = await Note.findOne({ _id: noteId, userId: user._id });
  if (!note) {
    return res.status(404).json({
      success: false,
      message: 'Note not found',
    });
  }
  
  try {
    const aiProvider = await getUserAIProvider(user);
    
    const prompt = `${customPrompt}\n\nContent:\n${note.content}`;
    
    const response = await aiProvider.generateResponse(prompt);
    
    res.status(200).json({
      success: true,
      data: {
        result: response.content,
      },
    });
  } catch (error) {
    logger.error('AI process error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to process with AI',
    });
  }
}));

export default router;
