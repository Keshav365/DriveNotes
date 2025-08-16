import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../utils/logger';
import { EncryptionService } from '../utils/encryption';

export interface AIResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
}

export interface AIConfig {
  provider: 'openai' | 'gemini' | 'claude';
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export abstract class BaseAIProvider {
  protected config: AIConfig;

  constructor(config: AIConfig) {
    this.config = config;
  }

  abstract generateResponse(prompt: string): Promise<AIResponse>;
  abstract extractReminders(text: string): Promise<any[]>;
  abstract categorizeContent(text: string): Promise<string[]>;
}

export class OpenAIProvider extends BaseAIProvider {
  private client: OpenAI;

  constructor(config: AIConfig) {
    super(config);
    this.client = new OpenAI({ 
      apiKey: config.apiKey,
    });
  }

  async generateResponse(prompt: string): Promise<AIResponse> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.config.model || 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: this.config.maxTokens || 1000,
        temperature: this.config.temperature || 0.7,
      });

      const choice = response.choices[0];
      if (!choice || !choice.message) {
        throw new Error('No response from OpenAI');
      }

      return {
        content: choice.message.content || '',
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0,
        },
        model: response.model,
      };
    } catch (error) {
      logger.error('OpenAI API error:', error);
      throw new Error('Failed to generate AI response');
    }
  }

  async extractReminders(text: string): Promise<any[]> {
    const prompt = `Extract reminders, deadlines, or scheduled tasks from the following text. Return as JSON array with objects containing: title, date, time, description. If no reminders found, return empty array.\n\nText: ${text}`;
    
    try {
      const response = await this.generateResponse(prompt);
      return JSON.parse(response.content);
    } catch (error) {
      logger.error('Failed to extract reminders:', error);
      return [];
    }
  }

  async categorizeContent(text: string): Promise<string[]> {
    const prompt = `Categorize the following text into relevant tags/categories. Return as JSON array of strings. Categories should be concise and relevant.\n\nText: ${text}`;
    
    try {
      const response = await this.generateResponse(prompt);
      return JSON.parse(response.content);
    } catch (error) {
      logger.error('Failed to categorize content:', error);
      return [];
    }
  }
}

export class GeminiProvider extends BaseAIProvider {
  private client: GoogleGenerativeAI;

  constructor(config: AIConfig) {
    super(config);
    this.client = new GoogleGenerativeAI(config.apiKey);
  }

  async generateResponse(prompt: string): Promise<AIResponse> {
    try {
      const model = this.client.getGenerativeModel({ 
        model: this.config.model || 'gemini-pro' 
      });

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      return {
        content: text,
        model: this.config.model || 'gemini-pro',
      };
    } catch (error) {
      logger.error('Gemini API error:', error);
      throw new Error('Failed to generate AI response');
    }
  }

  async extractReminders(text: string): Promise<any[]> {
    const prompt = `Extract reminders, deadlines, or scheduled tasks from the following text. Return as JSON array with objects containing: title, date, time, description. If no reminders found, return empty array.\n\nText: ${text}`;
    
    try {
      const response = await this.generateResponse(prompt);
      return JSON.parse(response.content);
    } catch (error) {
      logger.error('Failed to extract reminders:', error);
      return [];
    }
  }

  async categorizeContent(text: string): Promise<string[]> {
    const prompt = `Categorize the following text into relevant tags/categories. Return as JSON array of strings. Categories should be concise and relevant.\n\nText: ${text}`;
    
    try {
      const response = await this.generateResponse(prompt);
      return JSON.parse(response.content);
    } catch (error) {
      logger.error('Failed to categorize content:', error);
      return [];
    }
  }
}

export class ClaudeProvider extends BaseAIProvider {
  private client: Anthropic;

  constructor(config: AIConfig) {
    super(config);
    this.client = new Anthropic({
      apiKey: config.apiKey,
    });
  }

  async generateResponse(prompt: string): Promise<AIResponse> {
    try {
      const response = await this.client.messages.create({
        model: this.config.model || 'claude-3-sonnet-20240229',
        max_tokens: this.config.maxTokens || 1000,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      return {
        content: content.text,
        usage: {
          promptTokens: response.usage.input_tokens,
          completionTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens,
        },
        model: response.model,
      };
    } catch (error) {
      logger.error('Claude API error:', error);
      throw new Error('Failed to generate AI response');
    }
  }

  async extractReminders(text: string): Promise<any[]> {
    const prompt = `Extract reminders, deadlines, or scheduled tasks from the following text. Return as JSON array with objects containing: title, date, time, description. If no reminders found, return empty array.\n\nText: ${text}`;
    
    try {
      const response = await this.generateResponse(prompt);
      return JSON.parse(response.content);
    } catch (error) {
      logger.error('Failed to extract reminders:', error);
      return [];
    }
  }

  async categorizeContent(text: string): Promise<string[]> {
    const prompt = `Categorize the following text into relevant tags/categories. Return as JSON array of strings. Categories should be concise and relevant.\n\nText: ${text}`;
    
    try {
      const response = await this.generateResponse(prompt);
      return JSON.parse(response.content);
    } catch (error) {
      logger.error('Failed to categorize content:', error);
      return [];
    }
  }
}

export class AIProviderFactory {
  static createProvider(config: AIConfig): BaseAIProvider {
    // Decrypt API key if it's encrypted
    const apiKey = config.apiKey.startsWith('encrypted:') 
      ? EncryptionService.decrypt(config.apiKey.substring(10))
      : config.apiKey;

    const providerConfig = { ...config, apiKey };

    switch (config.provider) {
      case 'openai':
        return new OpenAIProvider(providerConfig);
      case 'gemini':
        return new GeminiProvider(providerConfig);
      case 'claude':
        return new ClaudeProvider(providerConfig);
      default:
        throw new Error(`Unsupported AI provider: ${config.provider}`);
    }
  }

  static getAvailableProviders() {
    return [
      {
        id: 'openai',
        name: 'OpenAI',
        models: [
          'gpt-4',
          'gpt-4-turbo-preview',
          'gpt-3.5-turbo',
          'gpt-3.5-turbo-16k'
        ],
        description: 'Advanced language models from OpenAI'
      },
      {
        id: 'gemini',
        name: 'Google Gemini',
        models: [
          'gemini-2.0-flash-exp',
          'gemini-1.5-pro',
          'gemini-1.5-pro-002',
          'gemini-1.5-flash',
          'gemini-1.5-flash-002',
          'gemini-1.5-flash-8b',
          'gemini-pro',
          'gemini-pro-vision'
        ],
        description: 'Google\'s powerful AI models'
      },
      {
        id: 'claude',
        name: 'Anthropic Claude',
        models: [
          'claude-3-opus-20240229',
          'claude-3-sonnet-20240229',
          'claude-3-haiku-20240307'
        ],
        description: 'Anthropic\'s conversational AI models'
      }
    ];
  }
}
