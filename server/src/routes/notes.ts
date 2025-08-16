import express from 'express';
import { catchAsync } from '../middleware/errorHandler';
import { authenticateToken } from '../middleware/auth';
import Note, { INote, NoteColor, NotePriority } from '../models/Note';
import mongoose from 'mongoose';
import { logger } from '../utils/logger';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// GET /notes - Get all notes for the authenticated user
router.get('/', catchAsync(async (req, res) => {
  const userId = req.user!._id;
  const { archived = 'false', search, tags, priority, limit = '50', offset = '0' } = req.query;
  
  // Build query
  const query: any = { userId };
  
  // Filter by archived status
  query.archived = archived === 'true';
  
  // Filter by priority if specified
  if (priority && Object.values(NotePriority).includes(priority as NotePriority)) {
    query.priority = priority;
  }
  
  // Filter by tags if specified
  if (tags) {
    const tagArray = Array.isArray(tags) ? tags : [tags];
    query.tags = { $in: tagArray };
  }
  
  let noteQuery = Note.find(query);
  
  // Add text search if specified
  if (search && typeof search === 'string' && search.trim()) {
    noteQuery = noteQuery.find({ $text: { $search: search.trim() } });
  }
  
  // Sort by pinned status, then by position, then by creation date
  noteQuery = noteQuery.sort({ pinned: -1, position: 1, createdAt: -1 });
  
  // Apply pagination
  const limitNum = Math.min(parseInt(limit as string) || 50, 100); // Max 100 notes per request
  const offsetNum = parseInt(offset as string) || 0;
  noteQuery = noteQuery.skip(offsetNum).limit(limitNum);
  
  const notes = await noteQuery.exec();
  
  // Get total count for pagination
  const total = await Note.countDocuments(query);
  
  res.json({
    success: true,
    data: {
      notes,
      pagination: {
        total,
        limit: limitNum,
        offset: offsetNum,
        hasMore: offsetNum + limitNum < total
      }
    }
  });
}));

// GET /notes/tags - Get all unique tags for the user
router.get('/tags', catchAsync(async (req, res) => {
  const userId = req.user!._id;
  
  const tags = await Note.distinct('tags', { userId, archived: false });
  
  res.json({
    success: true,
    data: tags.filter(tag => tag && tag.trim()).sort()
  });
}));

// GET /notes/:id - Get a specific note
router.get('/:id', catchAsync(async (req, res) => {
  const { id } = req.params;
  const userId = req.user!._id;
  
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid note ID'
    });
  }
  
  const note = await Note.findOne({ _id: id, userId });
  
  if (!note) {
    return res.status(404).json({
      success: false,
      message: 'Note not found'
    });
  }
  
  res.json({
    success: true,
    data: note
  });
}));

// POST /notes - Create a new note
router.post('/', catchAsync(async (req, res) => {
  const userId = req.user!._id;
  const { title, content, color, priority, tags, pinned, reminder } = req.body;
  
  // Validation
  if (!title || !title.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Title is required'
    });
  }
  
  if (!content || !content.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Content is required'
    });
  }
  
  // Validate color if provided
  if (color && !Object.values(NoteColor).includes(color)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid note color'
    });
  }
  
  // Validate priority if provided
  if (priority && !Object.values(NotePriority).includes(priority)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid note priority'
    });
  }
  
  // Get the next position for the new note
  const maxPosition = await Note.findOne({ userId }, { position: 1 }).sort({ position: -1 });
  const position = maxPosition ? maxPosition.position + 1 : 0;
  
  const noteData: any = {
    title: title.trim(),
    content: content.trim(),
    userId,
    position
  };
  
  // Add optional fields if provided
  if (color) noteData.color = color;
  if (priority) noteData.priority = priority;
  if (tags && Array.isArray(tags)) noteData.tags = tags.filter(tag => typeof tag === 'string' && tag.trim());
  if (typeof pinned === 'boolean') noteData.pinned = pinned;
  if (reminder) noteData.reminder = new Date(reminder);
  
  const note = new Note(noteData);
  await note.save();
  
  logger.info(`Note created: ${note._id} by user: ${userId}`);
  
  res.status(201).json({
    success: true,
    data: note
  });
}));

// PUT /notes/:id - Update a note
router.put('/:id', catchAsync(async (req, res) => {
  const { id } = req.params;
  const userId = req.user!._id;
  const { title, content, color, priority, tags, pinned, reminder, archived } = req.body;
  
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid note ID'
    });
  }
  
  const note = await Note.findOne({ _id: id, userId });
  
  if (!note) {
    return res.status(404).json({
      success: false,
      message: 'Note not found'
    });
  }
  
  // Update fields if provided
  if (title !== undefined) {
    if (!title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Title cannot be empty'
      });
    }
    note.title = title.trim();
  }
  
  if (content !== undefined) {
    if (!content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Content cannot be empty'
      });
    }
    note.content = content.trim();
  }
  
  if (color !== undefined) {
    if (!Object.values(NoteColor).includes(color)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid note color'
      });
    }
    note.color = color;
  }
  
  if (priority !== undefined) {
    if (!Object.values(NotePriority).includes(priority)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid note priority'
      });
    }
    note.priority = priority;
  }
  
  if (tags !== undefined) {
    if (Array.isArray(tags)) {
      note.tags = tags.filter(tag => typeof tag === 'string' && tag.trim());
    } else {
      note.tags = [];
    }
  }
  
  if (typeof pinned === 'boolean') note.pinned = pinned;
  if (typeof archived === 'boolean') note.archived = archived;
  if (reminder !== undefined) {
    note.reminder = reminder ? new Date(reminder) : undefined;
  }
  
  await note.save();
  
  logger.info(`Note updated: ${note._id} by user: ${userId}`);
  
  res.json({
    success: true,
    data: note
  });
}));

// DELETE /notes/:id - Delete a note
router.delete('/:id', catchAsync(async (req, res) => {
  const { id } = req.params;
  const userId = req.user!._id;
  
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid note ID'
    });
  }
  
  const note = await Note.findOneAndDelete({ _id: id, userId });
  
  if (!note) {
    return res.status(404).json({
      success: false,
      message: 'Note not found'
    });
  }
  
  logger.info(`Note deleted: ${id} by user: ${userId}`);
  
  res.json({
    success: true,
    message: 'Note deleted successfully'
  });
}));

// POST /notes/reorder - Reorder notes
router.post('/reorder', catchAsync(async (req, res) => {
  const userId = req.user!._id;
  const { noteIds } = req.body;
  
  if (!Array.isArray(noteIds)) {
    return res.status(400).json({
      success: false,
      message: 'noteIds must be an array'
    });
  }
  
  // Validate all IDs
  const invalidIds = noteIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
  if (invalidIds.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Invalid note IDs provided'
    });
  }
  
  // Update positions in batch
  const updateOperations = noteIds.map((id, index) => ({
    updateOne: {
      filter: { _id: id, userId },
      update: { position: index }
    }
  }));
  
  const result = await Note.bulkWrite(updateOperations);
  
  logger.info(`Notes reordered: ${noteIds.length} notes by user: ${userId}`);
  
  res.json({
    success: true,
    data: {
      updated: result.modifiedCount
    }
  });
}));

// POST /notes/:id/duplicate - Duplicate a note
router.post('/:id/duplicate', catchAsync(async (req, res) => {
  const { id } = req.params;
  const userId = req.user!._id;
  
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid note ID'
    });
  }
  
  const originalNote = await Note.findOne({ _id: id, userId });
  
  if (!originalNote) {
    return res.status(404).json({
      success: false,
      message: 'Note not found'
    });
  }
  
  // Get the next position for the duplicated note
  const maxPosition = await Note.findOne({ userId }, { position: 1 }).sort({ position: -1 });
  const position = maxPosition ? maxPosition.position + 1 : 0;
  
  const duplicatedNote = new Note({
    title: `${originalNote.title} (Copy)`,
    content: originalNote.content,
    color: originalNote.color,
    priority: originalNote.priority,
    tags: [...originalNote.tags],
    pinned: false, // Don't duplicate pinned status
    archived: false, // Don't duplicate archived status
    reminder: originalNote.reminder,
    position,
    userId
  });
  
  await duplicatedNote.save();
  
  logger.info(`Note duplicated: ${id} -> ${duplicatedNote._id} by user: ${userId}`);
  
  res.status(201).json({
    success: true,
    data: duplicatedNote
  });
}));


// POST /notes/bulk - Bulk operations
router.post('/bulk', catchAsync(async (req, res) => {
  const userId = req.user!._id;
  const { operation, noteIds, data } = req.body;
  
  if (!Array.isArray(noteIds) || noteIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'noteIds must be a non-empty array'
    });
  }
  
  // Validate all IDs
  const invalidIds = noteIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
  if (invalidIds.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Invalid note IDs provided'
    });
  }
  
  let result;
  
  switch (operation) {
    case 'delete':
      result = await Note.deleteMany({ _id: { $in: noteIds }, userId });
      logger.info(`Bulk delete: ${result.deletedCount} notes by user: ${userId}`);
      break;
      
    case 'archive':
      result = await Note.updateMany(
        { _id: { $in: noteIds }, userId },
        { archived: true }
      );
      logger.info(`Bulk archive: ${result.modifiedCount} notes by user: ${userId}`);
      break;
      
    case 'unarchive':
      result = await Note.updateMany(
        { _id: { $in: noteIds }, userId },
        { archived: false }
      );
      logger.info(`Bulk unarchive: ${result.modifiedCount} notes by user: ${userId}`);
      break;
      
    case 'pin':
      result = await Note.updateMany(
        { _id: { $in: noteIds }, userId },
        { pinned: true }
      );
      logger.info(`Bulk pin: ${result.modifiedCount} notes by user: ${userId}`);
      break;
      
    case 'unpin':
      result = await Note.updateMany(
        { _id: { $in: noteIds }, userId },
        { pinned: false }
      );
      logger.info(`Bulk unpin: ${result.modifiedCount} notes by user: ${userId}`);
      break;
      
    case 'update':
      if (!data || typeof data !== 'object') {
        return res.status(400).json({
          success: false,
          message: 'Data object required for update operation'
        });
      }
      
      // Build update object with only allowed fields
      const updateData: any = {};
      if (data.color && Object.values(NoteColor).includes(data.color)) {
        updateData.color = data.color;
      }
      if (data.priority && Object.values(NotePriority).includes(data.priority)) {
        updateData.priority = data.priority;
      }
      if (Array.isArray(data.tags)) {
        updateData.tags = data.tags.filter(tag => typeof tag === 'string' && tag.trim());
      }
      
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No valid update fields provided'
        });
      }
      
      result = await Note.updateMany(
        { _id: { $in: noteIds }, userId },
        updateData
      );
      logger.info(`Bulk update: ${result.modifiedCount} notes by user: ${userId}`);
      break;
      
    default:
      return res.status(400).json({
        success: false,
        message: 'Invalid operation. Supported operations: delete, archive, unarchive, pin, unpin, update'
      });
  }
  
  res.json({
    success: true,
    data: {
      operation,
      processed: result.deletedCount || result.modifiedCount || 0
    }
  });
}));

export default router;
