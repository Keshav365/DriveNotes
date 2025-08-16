"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const errorHandler_1 = require("../middleware/errorHandler");
const auth_1 = require("../middleware/auth");
const Note_1 = __importStar(require("../models/Note"));
const mongoose_1 = __importDefault(require("mongoose"));
const logger_1 = require("../utils/logger");
const router = express_1.default.Router();
router.use(auth_1.authenticateToken);
router.get('/', (0, errorHandler_1.catchAsync)(async (req, res) => {
    const userId = req.user._id;
    const { archived = 'false', search, tags, priority, limit = '50', offset = '0' } = req.query;
    const query = { userId };
    query.archived = archived === 'true';
    if (priority && Object.values(Note_1.NotePriority).includes(priority)) {
        query.priority = priority;
    }
    if (tags) {
        const tagArray = Array.isArray(tags) ? tags : [tags];
        query.tags = { $in: tagArray };
    }
    let noteQuery = Note_1.default.find(query);
    if (search && typeof search === 'string' && search.trim()) {
        noteQuery = noteQuery.find({ $text: { $search: search.trim() } });
    }
    noteQuery = noteQuery.sort({ pinned: -1, position: 1, createdAt: -1 });
    const limitNum = Math.min(parseInt(limit) || 50, 100);
    const offsetNum = parseInt(offset) || 0;
    noteQuery = noteQuery.skip(offsetNum).limit(limitNum);
    const notes = await noteQuery.exec();
    const total = await Note_1.default.countDocuments(query);
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
router.get('/tags', (0, errorHandler_1.catchAsync)(async (req, res) => {
    const userId = req.user._id;
    const tags = await Note_1.default.distinct('tags', { userId, archived: false });
    res.json({
        success: true,
        data: tags.filter(tag => tag && tag.trim()).sort()
    });
}));
router.get('/:id', (0, errorHandler_1.catchAsync)(async (req, res) => {
    const { id } = req.params;
    const userId = req.user._id;
    if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid note ID'
        });
    }
    const note = await Note_1.default.findOne({ _id: id, userId });
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
router.post('/', (0, errorHandler_1.catchAsync)(async (req, res) => {
    const userId = req.user._id;
    const { title, content, color, priority, tags, pinned, reminder } = req.body;
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
    if (color && !Object.values(Note_1.NoteColor).includes(color)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid note color'
        });
    }
    if (priority && !Object.values(Note_1.NotePriority).includes(priority)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid note priority'
        });
    }
    const maxPosition = await Note_1.default.findOne({ userId }, { position: 1 }).sort({ position: -1 });
    const position = maxPosition ? maxPosition.position + 1 : 0;
    const noteData = {
        title: title.trim(),
        content: content.trim(),
        userId,
        position
    };
    if (color)
        noteData.color = color;
    if (priority)
        noteData.priority = priority;
    if (tags && Array.isArray(tags))
        noteData.tags = tags.filter(tag => typeof tag === 'string' && tag.trim());
    if (typeof pinned === 'boolean')
        noteData.pinned = pinned;
    if (reminder)
        noteData.reminder = new Date(reminder);
    const note = new Note_1.default(noteData);
    await note.save();
    logger_1.logger.info(`Note created: ${note._id} by user: ${userId}`);
    res.status(201).json({
        success: true,
        data: note
    });
}));
router.put('/:id', (0, errorHandler_1.catchAsync)(async (req, res) => {
    const { id } = req.params;
    const userId = req.user._id;
    const { title, content, color, priority, tags, pinned, reminder, archived } = req.body;
    if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid note ID'
        });
    }
    const note = await Note_1.default.findOne({ _id: id, userId });
    if (!note) {
        return res.status(404).json({
            success: false,
            message: 'Note not found'
        });
    }
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
        if (!Object.values(Note_1.NoteColor).includes(color)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid note color'
            });
        }
        note.color = color;
    }
    if (priority !== undefined) {
        if (!Object.values(Note_1.NotePriority).includes(priority)) {
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
        }
        else {
            note.tags = [];
        }
    }
    if (typeof pinned === 'boolean')
        note.pinned = pinned;
    if (typeof archived === 'boolean')
        note.archived = archived;
    if (reminder !== undefined) {
        note.reminder = reminder ? new Date(reminder) : undefined;
    }
    await note.save();
    logger_1.logger.info(`Note updated: ${note._id} by user: ${userId}`);
    res.json({
        success: true,
        data: note
    });
}));
router.delete('/:id', (0, errorHandler_1.catchAsync)(async (req, res) => {
    const { id } = req.params;
    const userId = req.user._id;
    if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid note ID'
        });
    }
    const note = await Note_1.default.findOneAndDelete({ _id: id, userId });
    if (!note) {
        return res.status(404).json({
            success: false,
            message: 'Note not found'
        });
    }
    logger_1.logger.info(`Note deleted: ${id} by user: ${userId}`);
    res.json({
        success: true,
        message: 'Note deleted successfully'
    });
}));
router.post('/reorder', (0, errorHandler_1.catchAsync)(async (req, res) => {
    const userId = req.user._id;
    const { noteIds } = req.body;
    if (!Array.isArray(noteIds)) {
        return res.status(400).json({
            success: false,
            message: 'noteIds must be an array'
        });
    }
    const invalidIds = noteIds.filter(id => !mongoose_1.default.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
        return res.status(400).json({
            success: false,
            message: 'Invalid note IDs provided'
        });
    }
    const updateOperations = noteIds.map((id, index) => ({
        updateOne: {
            filter: { _id: id, userId },
            update: { position: index }
        }
    }));
    const result = await Note_1.default.bulkWrite(updateOperations);
    logger_1.logger.info(`Notes reordered: ${noteIds.length} notes by user: ${userId}`);
    res.json({
        success: true,
        data: {
            updated: result.modifiedCount
        }
    });
}));
router.post('/:id/duplicate', (0, errorHandler_1.catchAsync)(async (req, res) => {
    const { id } = req.params;
    const userId = req.user._id;
    if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid note ID'
        });
    }
    const originalNote = await Note_1.default.findOne({ _id: id, userId });
    if (!originalNote) {
        return res.status(404).json({
            success: false,
            message: 'Note not found'
        });
    }
    const maxPosition = await Note_1.default.findOne({ userId }, { position: 1 }).sort({ position: -1 });
    const position = maxPosition ? maxPosition.position + 1 : 0;
    const duplicatedNote = new Note_1.default({
        title: `${originalNote.title} (Copy)`,
        content: originalNote.content,
        color: originalNote.color,
        priority: originalNote.priority,
        tags: [...originalNote.tags],
        pinned: false,
        archived: false,
        reminder: originalNote.reminder,
        position,
        userId
    });
    await duplicatedNote.save();
    logger_1.logger.info(`Note duplicated: ${id} -> ${duplicatedNote._id} by user: ${userId}`);
    res.status(201).json({
        success: true,
        data: duplicatedNote
    });
}));
router.post('/bulk', (0, errorHandler_1.catchAsync)(async (req, res) => {
    const userId = req.user._id;
    const { operation, noteIds, data } = req.body;
    if (!Array.isArray(noteIds) || noteIds.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'noteIds must be a non-empty array'
        });
    }
    const invalidIds = noteIds.filter(id => !mongoose_1.default.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
        return res.status(400).json({
            success: false,
            message: 'Invalid note IDs provided'
        });
    }
    let result;
    switch (operation) {
        case 'delete':
            result = await Note_1.default.deleteMany({ _id: { $in: noteIds }, userId });
            logger_1.logger.info(`Bulk delete: ${result.deletedCount} notes by user: ${userId}`);
            break;
        case 'archive':
            result = await Note_1.default.updateMany({ _id: { $in: noteIds }, userId }, { archived: true });
            logger_1.logger.info(`Bulk archive: ${result.modifiedCount} notes by user: ${userId}`);
            break;
        case 'unarchive':
            result = await Note_1.default.updateMany({ _id: { $in: noteIds }, userId }, { archived: false });
            logger_1.logger.info(`Bulk unarchive: ${result.modifiedCount} notes by user: ${userId}`);
            break;
        case 'pin':
            result = await Note_1.default.updateMany({ _id: { $in: noteIds }, userId }, { pinned: true });
            logger_1.logger.info(`Bulk pin: ${result.modifiedCount} notes by user: ${userId}`);
            break;
        case 'unpin':
            result = await Note_1.default.updateMany({ _id: { $in: noteIds }, userId }, { pinned: false });
            logger_1.logger.info(`Bulk unpin: ${result.modifiedCount} notes by user: ${userId}`);
            break;
        case 'update':
            if (!data || typeof data !== 'object') {
                return res.status(400).json({
                    success: false,
                    message: 'Data object required for update operation'
                });
            }
            const updateData = {};
            if (data.color && Object.values(Note_1.NoteColor).includes(data.color)) {
                updateData.color = data.color;
            }
            if (data.priority && Object.values(Note_1.NotePriority).includes(data.priority)) {
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
            result = await Note_1.default.updateMany({ _id: { $in: noteIds }, userId }, updateData);
            logger_1.logger.info(`Bulk update: ${result.modifiedCount} notes by user: ${userId}`);
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
exports.default = router;
//# sourceMappingURL=notes.js.map