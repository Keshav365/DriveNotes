"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const errorHandler_1 = require("../middleware/errorHandler");
const Folder_1 = __importDefault(require("../models/Folder"));
const File_1 = __importDefault(require("../models/File"));
const logger_1 = require("../utils/logger");
const firebaseService_1 = require("../services/firebaseService");
const router = express_1.default.Router();
router.get('/', [
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    (0, express_validator_1.query)('parentId').optional().isMongoId().withMessage('Invalid parent folder ID'),
    (0, express_validator_1.query)('search').optional().isString().withMessage('Search must be a string'),
    (0, express_validator_1.query)('sortBy').optional().isIn(['name', 'createdAt', 'lastModified', 'fileCount', 'totalSize']).withMessage('Invalid sort field'),
    (0, express_validator_1.query)('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Invalid sort order'),
], (0, errorHandler_1.catchAsync)(async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array(),
        });
    }
    const user = req.user;
    const { page = 1, limit = 20, parentId, search, sortBy = 'createdAt', sortOrder = 'desc', } = req.query;
    const query = { ownerId: user._id };
    if (parentId) {
        const parentFolder = await Folder_1.default.findById(parentId);
        if (!parentFolder || !parentFolder.canUserAccess(user._id.toString(), 'read')) {
            return res.status(403).json({
                success: false,
                message: 'Access denied to parent folder',
            });
        }
        query.parentId = parentId;
    }
    else {
        query.parentId = { $exists: false };
    }
    if (search) {
        query.$text = { $search: search };
    }
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;
    const skip = (Number(page) - 1) * Number(limit);
    const [folders, total] = await Promise.all([
        Folder_1.default.find(query)
            .sort(sortOptions)
            .skip(skip)
            .limit(Number(limit))
            .lean(),
        Folder_1.default.countDocuments(query),
    ]);
    res.status(200).json({
        success: true,
        data: {
            folders: folders.map(folder => ({
                ...folder,
                formattedSize: new Folder_1.default(folder).getFormattedSize(),
            })),
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit)),
            },
        },
    });
}));
router.post('/', [
    (0, express_validator_1.body)('name').isString().isLength({ min: 1, max: 255 }).withMessage('Folder name must be 1-255 characters'),
    (0, express_validator_1.body)('description').optional().isString().isLength({ max: 1000 }).withMessage('Description must be max 1000 characters'),
    (0, express_validator_1.body)('parentId').optional().isMongoId().withMessage('Invalid parent folder ID'),
    (0, express_validator_1.body)('color').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Color must be a valid hex color'),
    (0, express_validator_1.body)('tags').optional().isArray().withMessage('Tags must be an array'),
], (0, errorHandler_1.catchAsync)(async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array(),
        });
    }
    const user = req.user;
    const { name, description, parentId, color, tags } = req.body;
    let parentFolder = null;
    let parentPath = '';
    let level = 0;
    if (parentId) {
        parentFolder = await Folder_1.default.findById(parentId);
        if (!parentFolder) {
            return res.status(404).json({
                success: false,
                message: 'Parent folder not found',
            });
        }
        if (!parentFolder.canUserAccess(user._id.toString(), 'write')) {
            return res.status(403).json({
                success: false,
                message: 'Access denied to parent folder',
            });
        }
        if (parentFolder.level >= 19) {
            return res.status(400).json({
                success: false,
                message: 'Maximum folder depth exceeded',
            });
        }
        parentPath = parentFolder.getFullPath();
        level = parentFolder.level + 1;
    }
    const existingFolder = await Folder_1.default.findOne({
        ownerId: user._id,
        parentId: parentId || { $exists: false },
        name: name,
    });
    if (existingFolder) {
        return res.status(400).json({
            success: false,
            message: 'Folder with this name already exists in the current location',
        });
    }
    const folder = new Folder_1.default({
        name,
        description,
        parentId,
        parentPath,
        level,
        ownerId: user._id,
        color,
        tags: tags || [],
    });
    await folder.save();
    if (parentFolder) {
        await parentFolder.updateStatistics();
        await parentFolder.save();
    }
    logger_1.logger.info(`Folder created: ${name} by user ${user._id}`);
    res.status(201).json({
        success: true,
        message: 'Folder created successfully',
        data: folder,
    });
}));
router.get('/:id', (0, errorHandler_1.catchAsync)(async (req, res) => {
    const user = req.user;
    const { id } = req.params;
    const folder = await Folder_1.default.findById(id);
    if (!folder) {
        return res.status(404).json({
            success: false,
            message: 'Folder not found',
        });
    }
    if (!folder.canUserAccess(user._id.toString(), 'read')) {
        return res.status(403).json({
            success: false,
            message: 'Access denied',
        });
    }
    folder.lastAccessedAt = new Date();
    await folder.save();
    const [subfolders, files] = await Promise.all([
        Folder_1.default.find({ parentId: id, ownerId: user._id })
            .sort({ name: 1 })
            .limit(50),
        File_1.default.find({ folderId: id, ownerId: user._id })
            .sort({ name: 1 })
            .limit(50)
            .populate('uploadedBy', 'firstName lastName'),
    ]);
    res.status(200).json({
        success: true,
        data: {
            folder: {
                ...folder.toJSON(),
                formattedSize: folder.getFormattedSize(),
            },
            contents: {
                subfolders: subfolders.map(sf => ({
                    ...sf.toJSON(),
                    formattedSize: sf.getFormattedSize(),
                })),
                files: files.map(f => ({
                    ...f.toJSON(),
                    formattedSize: f.getFormattedSize(),
                    fileIcon: f.getFileIcon(),
                })),
            },
        },
    });
}));
router.put('/:id', [
    (0, express_validator_1.body)('name').optional().isString().isLength({ min: 1, max: 255 }).withMessage('Folder name must be 1-255 characters'),
    (0, express_validator_1.body)('description').optional().isString().isLength({ max: 1000 }).withMessage('Description must be max 1000 characters'),
    (0, express_validator_1.body)('color').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Color must be a valid hex color'),
    (0, express_validator_1.body)('tags').optional().isArray().withMessage('Tags must be an array'),
], (0, errorHandler_1.catchAsync)(async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array(),
        });
    }
    const user = req.user;
    const { id } = req.params;
    const { name, description, color, tags } = req.body;
    const folder = await Folder_1.default.findById(id);
    if (!folder) {
        return res.status(404).json({
            success: false,
            message: 'Folder not found',
        });
    }
    if (!folder.canUserAccess(user._id.toString(), 'write')) {
        return res.status(403).json({
            success: false,
            message: 'Access denied',
        });
    }
    if (name && name !== folder.name) {
        const existingFolder = await Folder_1.default.findOne({
            ownerId: user._id,
            parentId: folder.parentId || { $exists: false },
            name: name,
            _id: { $ne: id },
        });
        if (existingFolder) {
            return res.status(400).json({
                success: false,
                message: 'Folder with this name already exists in the current location',
            });
        }
    }
    if (name !== undefined)
        folder.name = name;
    if (description !== undefined)
        folder.description = description;
    if (color !== undefined)
        folder.color = color;
    if (tags !== undefined)
        folder.tags = tags;
    folder.lastModified = new Date();
    await folder.save();
    if (name && name !== folder.name) {
        const oldPath = folder.getFullPath();
        const newPath = folder.parentPath ? `${folder.parentPath}/${name}` : name;
        await Folder_1.default.updateMany({ ownerId: user._id, parentPath: { $regex: `^${oldPath}` } }, [{ $set: { parentPath: { $replaceAll: { input: '$parentPath', find: oldPath, replacement: newPath } } } }]);
        await File_1.default.updateMany({ ownerId: user._id, parentPath: { $regex: `^${oldPath}` } }, [{ $set: { parentPath: { $replaceAll: { input: '$parentPath', find: oldPath, replacement: newPath } } } }]);
    }
    logger_1.logger.info(`Folder updated: ${folder.name} by user ${user._id}`);
    res.status(200).json({
        success: true,
        message: 'Folder updated successfully',
        data: folder,
    });
}));
router.delete('/:id', [
    (0, express_validator_1.query)('force').optional().isBoolean().withMessage('Force must be boolean'),
], (0, errorHandler_1.catchAsync)(async (req, res) => {
    const user = req.user;
    const { id } = req.params;
    const { force = false } = req.query;
    const folder = await Folder_1.default.findById(id);
    if (!folder) {
        return res.status(404).json({
            success: false,
            message: 'Folder not found',
        });
    }
    if (!folder.canUserAccess(user._id.toString(), 'admin') && folder.ownerId.toString() !== user._id.toString()) {
        return res.status(403).json({
            success: false,
            message: 'Access denied',
        });
    }
    if (!force) {
        const [subfolderCount, fileCount] = await Promise.all([
            Folder_1.default.countDocuments({ parentId: id }),
            File_1.default.countDocuments({ folderId: id }),
        ]);
        if (subfolderCount > 0 || fileCount > 0) {
            return res.status(400).json({
                success: false,
                message: 'Folder is not empty. Use force=true to delete recursively.',
                data: {
                    subfolders: subfolderCount,
                    files: fileCount,
                },
            });
        }
    }
    try {
        if (force) {
            const folderPath = folder.getFullPath();
            const [subfolders, files] = await Promise.all([
                Folder_1.default.find({
                    ownerId: user._id,
                    $or: [
                        { parentId: id },
                        { parentPath: { $regex: `^${folderPath}` } }
                    ]
                }),
                File_1.default.find({
                    ownerId: user._id,
                    $or: [
                        { folderId: id },
                        { parentPath: { $regex: `^${folderPath}` } }
                    ]
                }),
            ]);
            const deleteFilePromises = files.map(async (file) => {
                try {
                    await firebaseService_1.defaultFirebaseService.deleteFile(file.firebasePath);
                    user.storage.used = Math.max(0, user.storage.used - file.size);
                }
                catch (error) {
                    logger_1.logger.error(`Failed to delete file from Firebase: ${file.name}`, error);
                }
            });
            await Promise.all(deleteFilePromises);
            await Promise.all([
                Folder_1.default.deleteMany({
                    ownerId: user._id,
                    $or: [
                        { _id: id },
                        { parentId: id },
                        { parentPath: { $regex: `^${folderPath}` } }
                    ]
                }),
                File_1.default.deleteMany({
                    ownerId: user._id,
                    $or: [
                        { folderId: id },
                        { parentPath: { $regex: `^${folderPath}` } }
                    ]
                }),
            ]);
            logger_1.logger.info(`Folder deleted recursively: ${folder.name} by user ${user._id}`);
        }
        else {
            await Folder_1.default.findByIdAndDelete(id);
            logger_1.logger.info(`Empty folder deleted: ${folder.name} by user ${user._id}`);
        }
        await user.save();
        if (folder.parentId) {
            const parentFolder = await Folder_1.default.findById(folder.parentId);
            if (parentFolder) {
                await parentFolder.updateStatistics();
                await parentFolder.save();
            }
        }
        res.status(200).json({
            success: true,
            message: 'Folder deleted successfully',
        });
    }
    catch (error) {
        logger_1.logger.error(`Failed to delete folder ${folder.name}:`, error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete folder',
        });
    }
}));
router.post('/:id/move', [
    (0, express_validator_1.body)('newParentId').optional().isMongoId().withMessage('Invalid new parent folder ID'),
], (0, errorHandler_1.catchAsync)(async (req, res) => {
    const user = req.user;
    const { id } = req.params;
    const { newParentId } = req.body;
    const folder = await Folder_1.default.findById(id);
    if (!folder) {
        return res.status(404).json({
            success: false,
            message: 'Folder not found',
        });
    }
    if (!folder.canUserAccess(user._id.toString(), 'write')) {
        return res.status(403).json({
            success: false,
            message: 'Access denied',
        });
    }
    let newParentFolder = null;
    let newParentPath = '';
    let newLevel = 0;
    if (newParentId) {
        if (newParentId === id) {
            return res.status(400).json({
                success: false,
                message: 'Cannot move folder to itself',
            });
        }
        newParentFolder = await Folder_1.default.findById(newParentId);
        if (!newParentFolder) {
            return res.status(404).json({
                success: false,
                message: 'New parent folder not found',
            });
        }
        if (!newParentFolder.canUserAccess(user._id.toString(), 'write')) {
            return res.status(403).json({
                success: false,
                message: 'Access denied to new parent folder',
            });
        }
        const isCircular = await folder.isAncestorOf(newParentId);
        if (isCircular) {
            return res.status(400).json({
                success: false,
                message: 'Cannot move folder to its descendant',
            });
        }
        if (newParentFolder.level >= 19) {
            return res.status(400).json({
                success: false,
                message: 'Move would exceed maximum folder depth',
            });
        }
        newParentPath = newParentFolder.getFullPath();
        newLevel = newParentFolder.level + 1;
    }
    const existingFolder = await Folder_1.default.findOne({
        ownerId: user._id,
        parentId: newParentId || { $exists: false },
        name: folder.name,
        _id: { $ne: id },
    });
    if (existingFolder) {
        return res.status(400).json({
            success: false,
            message: 'Folder with this name already exists in the destination',
        });
    }
    const oldPath = folder.getFullPath();
    const oldParentId = folder.parentId;
    folder.parentId = newParentId || undefined;
    folder.parentPath = newParentPath;
    folder.level = newLevel;
    await folder.save();
    const newPath = folder.getFullPath();
    await Promise.all([
        Folder_1.default.updateMany({ ownerId: user._id, parentPath: { $regex: `^${oldPath}` } }, [{ $set: {
                    parentPath: { $replaceAll: { input: '$parentPath', find: oldPath, replacement: newPath } },
                    level: { $add: ['$level', newLevel - folder.level + 1] }
                } }]),
        File_1.default.updateMany({ ownerId: user._id, parentPath: { $regex: `^${oldPath}` } }, [{ $set: { parentPath: { $replaceAll: { input: '$parentPath', find: oldPath, replacement: newPath } } } }]),
    ]);
    if (oldParentId) {
        const oldParentFolder = await Folder_1.default.findById(oldParentId);
        if (oldParentFolder) {
            await oldParentFolder.updateStatistics();
            await oldParentFolder.save();
        }
    }
    if (newParentFolder) {
        await newParentFolder.updateStatistics();
        await newParentFolder.save();
    }
    logger_1.logger.info(`Folder moved: ${folder.name} by user ${user._id}`);
    res.status(200).json({
        success: true,
        message: 'Folder moved successfully',
        data: folder,
    });
}));
router.post('/:id/share', [
    (0, express_validator_1.body)('expiresIn').optional().isInt({ min: 1 }).withMessage('Expires in must be a positive integer (hours)'),
    (0, express_validator_1.body)('password').optional().isString().withMessage('Password must be a string'),
    (0, express_validator_1.body)('allowUpload').optional().isBoolean().withMessage('Allow upload must be boolean'),
], (0, errorHandler_1.catchAsync)(async (req, res) => {
    const user = req.user;
    const { id } = req.params;
    const { expiresIn, password, allowUpload = false } = req.body;
    const folder = await Folder_1.default.findById(id);
    if (!folder) {
        return res.status(404).json({
            success: false,
            message: 'Folder not found',
        });
    }
    if (!folder.canUserAccess(user._id.toString(), 'admin') && folder.ownerId.toString() !== user._id.toString()) {
        return res.status(403).json({
            success: false,
            message: 'Access denied',
        });
    }
    const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 60 * 60 * 1000) : undefined;
    const shareLink = folder.generateShareLink(expiresAt, password);
    if (allowUpload !== undefined) {
        folder.permissions.shareLink.allowUpload = allowUpload;
    }
    await folder.save();
    logger_1.logger.info(`Share link generated for folder ${folder.name} by user ${user._id}`);
    res.status(200).json({
        success: true,
        message: 'Share link generated successfully',
        data: {
            shareLink,
            token: folder.permissions.shareLink.token,
            expiresAt: folder.permissions.shareLink.expiresAt,
            hasPassword: !!folder.permissions.shareLink.password,
            allowUpload: folder.permissions.shareLink.allowUpload,
        },
    });
}));
exports.default = router;
//# sourceMappingURL=folders.js.map