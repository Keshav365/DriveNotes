"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const express_validator_1 = require("express-validator");
const errorHandler_1 = require("../middleware/errorHandler");
const firebaseService_1 = require("../services/firebaseService");
const File_1 = __importDefault(require("../models/File"));
const Folder_1 = __importDefault(require("../models/Folder"));
const logger_1 = require("../utils/logger");
const path_1 = __importDefault(require("path"));
const router = express_1.default.Router();
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE || '104857600'),
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = process.env.ALLOWED_FILE_TYPES?.split(',') || [
            'image/*',
            'application/pdf',
            'text/*',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ];
        const isAllowed = allowedTypes.some(type => {
            if (type.endsWith('/*')) {
                return file.mimetype.startsWith(type.replace('/*', '/'));
            }
            return file.mimetype === type;
        });
        if (isAllowed) {
            cb(null, true);
        }
        else {
            cb(new Error(`File type ${file.mimetype} not allowed`));
        }
    },
});
router.get('/', [
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    (0, express_validator_1.query)('folderId').optional().isMongoId().withMessage('Invalid folder ID'),
    (0, express_validator_1.query)('search').optional().isString().withMessage('Search must be a string'),
    (0, express_validator_1.query)('type').optional().isIn(['image', 'document', 'video', 'audio', 'archive', 'all']).withMessage('Invalid type filter'),
    (0, express_validator_1.query)('sortBy').optional().isIn(['name', 'size', 'createdAt', 'lastModified']).withMessage('Invalid sort field'),
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
    const { page = 1, limit = 20, folderId, search, type, sortBy = 'createdAt', sortOrder = 'desc', } = req.query;
    const query = { ownerId: user._id };
    if (folderId) {
        const folder = await Folder_1.default.findById(folderId);
        if (!folder || !folder.canUserAccess(user._id.toString(), 'read')) {
            return res.status(403).json({
                success: false,
                message: 'Access denied to folder',
            });
        }
        query.folderId = folderId;
    }
    else {
        query.folderId = { $exists: false };
    }
    if (search) {
        query.$text = { $search: search };
    }
    if (type && type !== 'all') {
        const typeExtensions = {
            image: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'],
            document: ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt'],
            video: ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm'],
            audio: ['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma'],
            archive: ['zip', 'rar', '7z', 'tar', 'gz'],
        };
        query.extension = { $in: typeExtensions[type] };
    }
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;
    const skip = (Number(page) - 1) * Number(limit);
    const [files, total] = await Promise.all([
        File_1.default.find(query)
            .sort(sortOptions)
            .skip(skip)
            .limit(Number(limit))
            .populate('uploadedBy', 'firstName lastName email')
            .lean(),
        File_1.default.countDocuments(query),
    ]);
    res.status(200).json({
        success: true,
        data: {
            files: files.map(file => ({
                ...file,
                formattedSize: new File_1.default(file).getFormattedSize(),
                fileIcon: new File_1.default(file).getFileIcon(),
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
router.post('/upload', upload.array('files', 10), [
    (0, express_validator_1.body)('folderId').optional().isMongoId().withMessage('Invalid folder ID'),
    (0, express_validator_1.body)('description').optional().isString().withMessage('Description must be a string'),
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
    const files = req.files;
    const { folderId, description, tags } = req.body;
    if (!files || files.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'No files provided',
        });
    }
    let folder = null;
    let parentPath = '';
    if (folderId) {
        folder = await Folder_1.default.findById(folderId);
        if (!folder || !folder.canUserAccess(user._id.toString(), 'write')) {
            return res.status(403).json({
                success: false,
                message: 'Access denied to folder',
            });
        }
        parentPath = folder.getFullPath();
    }
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    if (!user.canUpload(totalSize)) {
        return res.status(413).json({
            success: false,
            message: 'Storage limit exceeded',
            required: totalSize,
            available: user.storage.limit - user.storage.used,
        });
    }
    const uploadResults = [];
    const uploadPromises = files.map(async (file) => {
        try {
            const extension = path_1.default.extname(file.originalname).toLowerCase().substring(1);
            const firebaseResult = await firebaseService_1.defaultFirebaseService.uploadFile(file.buffer, file.originalname, file.mimetype, user._id.toString(), folder ? folder.name : undefined);
            const fileDoc = new File_1.default({
                name: firebaseResult.fileName,
                originalName: file.originalname,
                size: file.size,
                contentType: file.mimetype,
                extension,
                firebasePath: `users/${user._id}/${folder ? folder.name + '/' : ''}${firebaseResult.fileName}`,
                firebaseUrl: firebaseResult.firebaseUrl,
                publicUrl: firebaseResult.url,
                folderId: folder?._id,
                parentPath,
                ownerId: user._id,
                uploadedBy: user._id,
                description,
                tags: tags ? JSON.parse(tags) : [],
                status: 'ready',
            });
            await fileDoc.save();
            user.storage.used += file.size;
            await user.save();
            if (folder) {
                await folder.updateStatistics();
                await folder.save();
            }
            logger_1.logger.info(`File uploaded: ${file.originalname} by user ${user._id}`);
            return {
                success: true,
                file: {
                    id: fileDoc._id,
                    name: fileDoc.name,
                    originalName: fileDoc.originalName,
                    size: fileDoc.size,
                    formattedSize: fileDoc.getFormattedSize(),
                    contentType: fileDoc.contentType,
                    extension: fileDoc.extension,
                    publicUrl: fileDoc.publicUrl,
                    fileIcon: fileDoc.getFileIcon(),
                    status: fileDoc.status,
                },
            };
        }
        catch (error) {
            logger_1.logger.error(`File upload failed for ${file.originalname}:`, error);
            return {
                success: false,
                fileName: file.originalname,
                error: 'Upload failed',
            };
        }
    });
    const results = await Promise.all(uploadPromises);
    uploadResults.push(...results);
    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;
    res.status(successCount > 0 ? 200 : 500).json({
        success: successCount > 0,
        message: `${successCount} file(s) uploaded successfully${failedCount > 0 ? `, ${failedCount} failed` : ''}`,
        data: {
            results: uploadResults,
            summary: {
                success: successCount,
                failed: failedCount,
                total: files.length,
            },
        },
    });
}));
router.get('/:id', (0, errorHandler_1.catchAsync)(async (req, res) => {
    const user = req.user;
    const { id } = req.params;
    const file = await File_1.default.findById(id)
        .populate('uploadedBy', 'firstName lastName email')
        .populate('folderId', 'name parentPath');
    if (!file) {
        return res.status(404).json({
            success: false,
            message: 'File not found',
        });
    }
    if (!file.canUserAccess(user._id.toString(), 'read')) {
        return res.status(403).json({
            success: false,
            message: 'Access denied',
        });
    }
    file.lastAccessedAt = new Date();
    await file.save();
    res.status(200).json({
        success: true,
        data: {
            ...file.toJSON(),
            formattedSize: file.getFormattedSize(),
            fileIcon: file.getFileIcon(),
        },
    });
}));
router.put('/:id', [
    (0, express_validator_1.body)('name').optional().isString().withMessage('Name must be a string'),
    (0, express_validator_1.body)('description').optional().isString().withMessage('Description must be a string'),
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
    const { name, description, tags } = req.body;
    const file = await File_1.default.findById(id);
    if (!file) {
        return res.status(404).json({
            success: false,
            message: 'File not found',
        });
    }
    if (!file.canUserAccess(user._id.toString(), 'write')) {
        return res.status(403).json({
            success: false,
            message: 'Access denied',
        });
    }
    if (name !== undefined)
        file.name = name;
    if (description !== undefined)
        file.description = description;
    if (tags !== undefined)
        file.tags = tags;
    file.lastModified = new Date();
    await file.save();
    logger_1.logger.info(`File metadata updated: ${file.name} by user ${user._id}`);
    res.status(200).json({
        success: true,
        message: 'File updated successfully',
        data: file,
    });
}));
router.delete('/:id', (0, errorHandler_1.catchAsync)(async (req, res) => {
    const user = req.user;
    const { id } = req.params;
    const file = await File_1.default.findById(id);
    if (!file) {
        return res.status(404).json({
            success: false,
            message: 'File not found',
        });
    }
    if (!file.canUserAccess(user._id.toString(), 'admin') && file.ownerId.toString() !== user._id.toString()) {
        return res.status(403).json({
            success: false,
            message: 'Access denied',
        });
    }
    try {
        await firebaseService_1.defaultFirebaseService.deleteFile(file.firebasePath);
        if (file.previousVersions.length > 0) {
            const deletePromises = file.previousVersions.map(version => firebaseService_1.defaultFirebaseService.deleteFile(version.firebasePath));
            await Promise.all(deletePromises);
        }
        user.storage.used = Math.max(0, user.storage.used - file.size);
        await user.save();
        await File_1.default.findByIdAndDelete(id);
        if (file.folderId) {
            const folder = await Folder_1.default.findById(file.folderId);
            if (folder) {
                await folder.updateStatistics();
                await folder.save();
            }
        }
        logger_1.logger.info(`File deleted: ${file.name} by user ${user._id}`);
        res.status(200).json({
            success: true,
            message: 'File deleted successfully',
        });
    }
    catch (error) {
        logger_1.logger.error(`Failed to delete file ${file.name}:`, error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete file',
        });
    }
}));
router.post('/:id/share', [
    (0, express_validator_1.body)('expiresIn').optional().isInt({ min: 1 }).withMessage('Expires in must be a positive integer (hours)'),
    (0, express_validator_1.body)('password').optional().isString().withMessage('Password must be a string'),
    (0, express_validator_1.body)('allowDownload').optional().isBoolean().withMessage('Allow download must be boolean'),
], (0, errorHandler_1.catchAsync)(async (req, res) => {
    const user = req.user;
    const { id } = req.params;
    const { expiresIn, password, allowDownload = true } = req.body;
    const file = await File_1.default.findById(id);
    if (!file) {
        return res.status(404).json({
            success: false,
            message: 'File not found',
        });
    }
    if (!file.canUserAccess(user._id.toString(), 'admin') && file.ownerId.toString() !== user._id.toString()) {
        return res.status(403).json({
            success: false,
            message: 'Access denied',
        });
    }
    const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 60 * 60 * 1000) : undefined;
    const shareLink = file.generateShareLink(expiresAt, password);
    if (allowDownload !== undefined) {
        file.permissions.shareLink.allowDownload = allowDownload;
    }
    await file.save();
    logger_1.logger.info(`Share link generated for file ${file.name} by user ${user._id}`);
    res.status(200).json({
        success: true,
        message: 'Share link generated successfully',
        data: {
            shareLink,
            token: file.permissions.shareLink.token,
            expiresAt: file.permissions.shareLink.expiresAt,
            hasPassword: !!file.permissions.shareLink.password,
            allowDownload: file.permissions.shareLink.allowDownload,
        },
    });
}));
router.get('/:id/download', (0, errorHandler_1.catchAsync)(async (req, res) => {
    const user = req.user;
    const { id } = req.params;
    const file = await File_1.default.findById(id);
    if (!file) {
        return res.status(404).json({
            success: false,
            message: 'File not found',
        });
    }
    if (user && !file.canUserAccess(user._id.toString(), 'read')) {
        return res.status(403).json({
            success: false,
            message: 'Access denied',
        });
    }
    file.downloadCount += 1;
    file.lastAccessedAt = new Date();
    await file.save();
    const downloadUrl = await firebaseService_1.defaultFirebaseService.getSignedUrl(file.firebasePath, 3600);
    res.status(200).json({
        success: true,
        data: {
            downloadUrl,
            fileName: file.originalName,
            size: file.size,
            contentType: file.contentType,
        },
    });
}));
exports.default = router;
//# sourceMappingURL=files.js.map