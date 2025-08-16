import express from 'express';
import multer from 'multer';
import { body, query, validationResult } from 'express-validator';
import { catchAsync, createError } from '../middleware/errorHandler';
import { defaultFirebaseService } from '../services/firebaseService';
import File from '../models/File';
import Folder from '../models/Folder';
import User from '../models/User';
import { logger } from '../utils/logger';
import path from 'path';
import crypto from 'crypto';
import { AIProviderFactory } from '../services/aiProviderService';
import { EncryptionService } from '../utils/encryption';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '104857600'), // 100MB default
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
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed`));
    }
  },
});

// GET /api/files - List files with pagination and filters
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('folderId').optional().isMongoId().withMessage('Invalid folder ID'),
  query('search').optional().isString().withMessage('Search must be a string'),
  query('type').optional().isIn(['image', 'document', 'video', 'audio', 'archive', 'all']).withMessage('Invalid type filter'),
  query('sortBy').optional().isIn(['name', 'size', 'createdAt', 'lastModified']).withMessage('Invalid sort field'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Invalid sort order'),
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
  const {
    page = 1,
    limit = 20,
    folderId,
    search,
    type,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = req.query;

  // Build query
  const query: any = { ownerId: user._id };
  
  if (folderId) {
    // Verify folder access
    const folder = await Folder.findById(folderId);
    if (!folder || !folder.canUserAccess(user._id.toString(), 'read')) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to folder',
      });
    }
    query.folderId = folderId;
  } else {
    query.folderId = { $exists: false }; // Root level files
  }

  if (search) {
    query.$text = { $search: search as string };
  }

  if (type && type !== 'all') {
    const typeExtensions = {
      image: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'],
      document: ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt'],
      video: ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm'],
      audio: ['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma'],
      archive: ['zip', 'rar', '7z', 'tar', 'gz'],
    };
    query.extension = { $in: typeExtensions[type as keyof typeof typeExtensions] };
  }

  // Sort options
  const sortOptions: any = {};
  sortOptions[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

  const skip = (Number(page) - 1) * Number(limit);

  const [files, total] = await Promise.all([
    File.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(Number(limit))
      .populate('uploadedBy', 'firstName lastName email')
      .lean(),
    File.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    data: {
      files: files.map(file => ({
        ...file,
        formattedSize: new File(file).getFormattedSize(),
        fileIcon: new File(file).getFileIcon(),
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

// POST /api/files/upload - Upload files
router.post('/upload', upload.array('files', 10), [
  body('folderId').optional().isMongoId().withMessage('Invalid folder ID'),
  body('description').optional().isString().withMessage('Description must be a string'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
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
  const files = req.files as Express.Multer.File[];
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
    folder = await Folder.findById(folderId);
    if (!folder || !folder.canUserAccess(user._id.toString(), 'write')) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to folder',
      });
    }
    parentPath = folder.getFullPath();
  }

  // Check storage limits
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
      const extension = path.extname(file.originalname).toLowerCase().substring(1);
      
      // Upload to Firebase
      const firebaseResult = await defaultFirebaseService.uploadFile(
        file.buffer,
        file.originalname,
        file.mimetype,
        user._id.toString(),
        folder ? folder.name : undefined
      );

      // Create file record
      const fileDoc = new File({
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

      // Update user storage usage
      user.storage.used += file.size;
      await user.save();

      // Update folder statistics if applicable
      if (folder) {
        await folder.updateStatistics();
        await folder.save();
      }

      logger.info(`File uploaded: ${file.originalname} by user ${user._id}`);
      
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
    } catch (error) {
      logger.error(`File upload failed for ${file.originalname}:`, error);
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

// GET /api/files/:id - Get file details
router.get('/:id', catchAsync(async (req, res) => {
  const user = req.user!;
  const { id } = req.params;

  const file = await File.findById(id)
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

  // Update last accessed time
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

// PUT /api/files/:id - Update file metadata
router.put('/:id', [
  body('name').optional().isString().withMessage('Name must be a string'),
  body('description').optional().isString().withMessage('Description must be a string'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
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
  const { id } = req.params;
  const { name, description, tags } = req.body;

  const file = await File.findById(id);
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

  if (name !== undefined) file.name = name;
  if (description !== undefined) file.description = description;
  if (tags !== undefined) file.tags = tags;
  
  file.lastModified = new Date();
  await file.save();

  logger.info(`File metadata updated: ${file.name} by user ${user._id}`);

  res.status(200).json({
    success: true,
    message: 'File updated successfully',
    data: file,
  });
}));

// DELETE /api/files/:id - Delete file
router.delete('/:id', catchAsync(async (req, res) => {
  const user = req.user!;
  const { id } = req.params;

  const file = await File.findById(id);
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
    // Delete from Firebase
    await defaultFirebaseService.deleteFile(file.firebasePath);
    
    // Delete previous versions from Firebase
    if (file.previousVersions.length > 0) {
      const deletePromises = file.previousVersions.map(version => 
        defaultFirebaseService.deleteFile(version.firebasePath)
      );
      await Promise.all(deletePromises);
    }

    // Update user storage usage
    user.storage.used = Math.max(0, user.storage.used - file.size);
    await user.save();

    // Delete file record
    await File.findByIdAndDelete(id);

    // Update folder statistics if applicable
    if (file.folderId) {
      const folder = await Folder.findById(file.folderId);
      if (folder) {
        await folder.updateStatistics();
        await folder.save();
      }
    }

    logger.info(`File deleted: ${file.name} by user ${user._id}`);

    res.status(200).json({
      success: true,
      message: 'File deleted successfully',
    });
  } catch (error) {
    logger.error(`Failed to delete file ${file.name}:`, error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete file',
    });
  }
}));

// POST /api/files/:id/share - Generate share link
router.post('/:id/share', [
  body('expiresIn').optional().isInt({ min: 1 }).withMessage('Expires in must be a positive integer (hours)'),
  body('password').optional().isString().withMessage('Password must be a string'),
  body('allowDownload').optional().isBoolean().withMessage('Allow download must be boolean'),
], catchAsync(async (req, res) => {
  const user = req.user!;
  const { id } = req.params;
  const { expiresIn, password, allowDownload = true } = req.body;

  const file = await File.findById(id);
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
    file.permissions.shareLink!.allowDownload = allowDownload;
  }
  
  await file.save();

  logger.info(`Share link generated for file ${file.name} by user ${user._id}`);

  res.status(200).json({
    success: true,
    message: 'Share link generated successfully',
    data: {
      shareLink,
      token: file.permissions.shareLink!.token,
      expiresAt: file.permissions.shareLink!.expiresAt,
      hasPassword: !!file.permissions.shareLink!.password,
      allowDownload: file.permissions.shareLink!.allowDownload,
    },
  });
}));

// GET /api/files/:id/download - Download file
router.get('/:id/download', catchAsync(async (req, res) => {
  const user = req.user;
  const { id } = req.params;

  const file = await File.findById(id);
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

  // Update download count
  file.downloadCount += 1;
  file.lastAccessedAt = new Date();
  await file.save();

  // Get signed download URL from Firebase
  const downloadUrl = await defaultFirebaseService.getSignedUrl(file.firebasePath, 3600); // 1 hour

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

export default router;
