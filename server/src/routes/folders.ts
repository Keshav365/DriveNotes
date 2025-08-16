import express from 'express';
import { body, query, validationResult } from 'express-validator';
import { catchAsync } from '../middleware/errorHandler';
import Folder from '../models/Folder';
import File from '../models/File';
import { logger } from '../utils/logger';
import { defaultFirebaseService } from '../services/firebaseService';

const router = express.Router();

// GET /api/folders - List folders with pagination and filters
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('parentId').optional().isMongoId().withMessage('Invalid parent folder ID'),
  query('search').optional().isString().withMessage('Search must be a string'),
  query('sortBy').optional().isIn(['name', 'createdAt', 'lastModified', 'fileCount', 'totalSize']).withMessage('Invalid sort field'),
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
    parentId,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = req.query;

  // Build query
  const query: any = { ownerId: user._id };
  
  if (parentId) {
    // Verify parent folder access
    const parentFolder = await Folder.findById(parentId);
    if (!parentFolder || !parentFolder.canUserAccess(user._id.toString(), 'read')) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to parent folder',
      });
    }
    query.parentId = parentId;
  } else {
    query.parentId = { $exists: false }; // Root level folders
  }

  if (search) {
    query.$text = { $search: search as string };
  }

  // Sort options
  const sortOptions: any = {};
  sortOptions[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

  const skip = (Number(page) - 1) * Number(limit);

  const [folders, total] = await Promise.all([
    Folder.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Folder.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    data: {
      folders: folders.map(folder => ({
        ...folder,
        formattedSize: new Folder(folder).getFormattedSize(),
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

// POST /api/folders - Create new folder
router.post('/', [
  body('name').isString().isLength({ min: 1, max: 255 }).withMessage('Folder name must be 1-255 characters'),
  body('description').optional().isString().isLength({ max: 1000 }).withMessage('Description must be max 1000 characters'),
  body('parentId').optional().isMongoId().withMessage('Invalid parent folder ID'),
  body('color').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Color must be a valid hex color'),
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
  const { name, description, parentId, color, tags } = req.body;

  let parentFolder = null;
  let parentPath = '';
  let level = 0;

  if (parentId) {
    parentFolder = await Folder.findById(parentId);
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

    if (parentFolder.level >= 19) { // Max depth is 20
      return res.status(400).json({
        success: false,
        message: 'Maximum folder depth exceeded',
      });
    }

    parentPath = parentFolder.getFullPath();
    level = parentFolder.level + 1;
  }

  // Check for duplicate names in the same parent
  const existingFolder = await Folder.findOne({
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

  const folder = new Folder({
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

  // Update parent folder statistics if applicable
  if (parentFolder) {
    await parentFolder.updateStatistics();
    await parentFolder.save();
  }

  logger.info(`Folder created: ${name} by user ${user._id}`);

  res.status(201).json({
    success: true,
    message: 'Folder created successfully',
    data: folder,
  });
}));

// GET /api/folders/:id - Get folder details
router.get('/:id', catchAsync(async (req, res) => {
  const user = req.user!;
  const { id } = req.params;

  const folder = await Folder.findById(id);
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

  // Update last accessed time
  folder.lastAccessedAt = new Date();
  await folder.save();

  // Get folder contents
  const [subfolders, files] = await Promise.all([
    Folder.find({ parentId: id, ownerId: user._id })
      .sort({ name: 1 })
      .limit(50), // Limit to prevent overloading
    File.find({ folderId: id, ownerId: user._id })
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

// PUT /api/folders/:id - Update folder
router.put('/:id', [
  body('name').optional().isString().isLength({ min: 1, max: 255 }).withMessage('Folder name must be 1-255 characters'),
  body('description').optional().isString().isLength({ max: 1000 }).withMessage('Description must be max 1000 characters'),
  body('color').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Color must be a valid hex color'),
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
  const { name, description, color, tags } = req.body;

  const folder = await Folder.findById(id);
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

  // Check for duplicate names if name is being changed
  if (name && name !== folder.name) {
    const existingFolder = await Folder.findOne({
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

  if (name !== undefined) folder.name = name;
  if (description !== undefined) folder.description = description;
  if (color !== undefined) folder.color = color;
  if (tags !== undefined) folder.tags = tags;

  folder.lastModified = new Date();
  await folder.save();

  // If name changed, update all subfolders' parentPath
  if (name && name !== folder.name) {
    const oldPath = folder.getFullPath();
    const newPath = folder.parentPath ? `${folder.parentPath}/${name}` : name;
    
    await Folder.updateMany(
      { ownerId: user._id, parentPath: { $regex: `^${oldPath}` } },
      [{ $set: { parentPath: { $replaceAll: { input: '$parentPath', find: oldPath, replacement: newPath } } } }]
    );
    
    await File.updateMany(
      { ownerId: user._id, parentPath: { $regex: `^${oldPath}` } },
      [{ $set: { parentPath: { $replaceAll: { input: '$parentPath', find: oldPath, replacement: newPath } } } }]
    );
  }

  logger.info(`Folder updated: ${folder.name} by user ${user._id}`);

  res.status(200).json({
    success: true,
    message: 'Folder updated successfully',
    data: folder,
  });
}));

// DELETE /api/folders/:id - Delete folder
router.delete('/:id', [
  query('force').optional().isBoolean().withMessage('Force must be boolean'),
], catchAsync(async (req, res) => {
  const user = req.user!;
  const { id } = req.params;
  const { force = false } = req.query;

  const folder = await Folder.findById(id);
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

  // Check if folder is empty (unless force delete)
  if (!force) {
    const [subfolderCount, fileCount] = await Promise.all([
      Folder.countDocuments({ parentId: id }),
      File.countDocuments({ folderId: id }),
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
      // Recursive delete - get all subfolders and files
      const folderPath = folder.getFullPath();
      const [subfolders, files] = await Promise.all([
        Folder.find({ 
          ownerId: user._id,
          $or: [
            { parentId: id },
            { parentPath: { $regex: `^${folderPath}` } }
          ]
        }),
        File.find({ 
          ownerId: user._id,
          $or: [
            { folderId: id },
            { parentPath: { $regex: `^${folderPath}` } }
          ]
        }),
      ]);

      // Delete all files from Firebase
      const deleteFilePromises = files.map(async (file) => {
        try {
          await defaultFirebaseService.deleteFile(file.firebasePath);
          // Update user storage
          user.storage.used = Math.max(0, user.storage.used - file.size);
        } catch (error) {
          logger.error(`Failed to delete file from Firebase: ${file.name}`, error);
        }
      });

      await Promise.all(deleteFilePromises);

      // Delete all database records
      await Promise.all([
        Folder.deleteMany({ 
          ownerId: user._id,
          $or: [
            { _id: id },
            { parentId: id },
            { parentPath: { $regex: `^${folderPath}` } }
          ]
        }),
        File.deleteMany({ 
          ownerId: user._id,
          $or: [
            { folderId: id },
            { parentPath: { $regex: `^${folderPath}` } }
          ]
        }),
      ]);

      logger.info(`Folder deleted recursively: ${folder.name} by user ${user._id}`);
    } else {
      // Simple delete (folder is empty)
      await Folder.findByIdAndDelete(id);
      logger.info(`Empty folder deleted: ${folder.name} by user ${user._id}`);
    }

    // Update user storage and save
    await user.save();

    // Update parent folder statistics if applicable
    if (folder.parentId) {
      const parentFolder = await Folder.findById(folder.parentId);
      if (parentFolder) {
        await parentFolder.updateStatistics();
        await parentFolder.save();
      }
    }

    res.status(200).json({
      success: true,
      message: 'Folder deleted successfully',
    });
  } catch (error) {
    logger.error(`Failed to delete folder ${folder.name}:`, error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete folder',
    });
  }
}));

// POST /api/folders/:id/move - Move folder to different location
router.post('/:id/move', [
  body('newParentId').optional().isMongoId().withMessage('Invalid new parent folder ID'),
], catchAsync(async (req, res) => {
  const user = req.user!;
  const { id } = req.params;
  const { newParentId } = req.body;

  const folder = await Folder.findById(id);
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
    // Cannot move to itself or its descendants
    if (newParentId === id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot move folder to itself',
      });
    }

    newParentFolder = await Folder.findById(newParentId);
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

    // Check for circular reference
    const isCircular = await folder.isAncestorOf(newParentId);
    if (isCircular) {
      return res.status(400).json({
        success: false,
        message: 'Cannot move folder to its descendant',
      });
    }

    // Check depth limits
    if (newParentFolder.level >= 19) {
      return res.status(400).json({
        success: false,
        message: 'Move would exceed maximum folder depth',
      });
    }

    newParentPath = newParentFolder.getFullPath();
    newLevel = newParentFolder.level + 1;
  }

  // Check for name conflicts
  const existingFolder = await Folder.findOne({
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

  // Update folder
  folder.parentId = newParentId || undefined;
  folder.parentPath = newParentPath;
  folder.level = newLevel;
  await folder.save();

  // Update all descendants' paths
  const newPath = folder.getFullPath();
  
  await Promise.all([
    Folder.updateMany(
      { ownerId: user._id, parentPath: { $regex: `^${oldPath}` } },
      [{ $set: { 
        parentPath: { $replaceAll: { input: '$parentPath', find: oldPath, replacement: newPath } },
        level: { $add: ['$level', newLevel - folder.level + 1] }
      } }]
    ),
    File.updateMany(
      { ownerId: user._id, parentPath: { $regex: `^${oldPath}` } },
      [{ $set: { parentPath: { $replaceAll: { input: '$parentPath', find: oldPath, replacement: newPath } } } }]
    ),
  ]);

  // Update statistics for old and new parent folders
  if (oldParentId) {
    const oldParentFolder = await Folder.findById(oldParentId);
    if (oldParentFolder) {
      await oldParentFolder.updateStatistics();
      await oldParentFolder.save();
    }
  }

  if (newParentFolder) {
    await newParentFolder.updateStatistics();
    await newParentFolder.save();
  }

  logger.info(`Folder moved: ${folder.name} by user ${user._id}`);

  res.status(200).json({
    success: true,
    message: 'Folder moved successfully',
    data: folder,
  });
}));

// POST /api/folders/:id/share - Generate share link for folder
router.post('/:id/share', [
  body('expiresIn').optional().isInt({ min: 1 }).withMessage('Expires in must be a positive integer (hours)'),
  body('password').optional().isString().withMessage('Password must be a string'),
  body('allowUpload').optional().isBoolean().withMessage('Allow upload must be boolean'),
], catchAsync(async (req, res) => {
  const user = req.user!;
  const { id } = req.params;
  const { expiresIn, password, allowUpload = false } = req.body;

  const folder = await Folder.findById(id);
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
    folder.permissions.shareLink!.allowUpload = allowUpload;
  }
  
  await folder.save();

  logger.info(`Share link generated for folder ${folder.name} by user ${user._id}`);

  res.status(200).json({
    success: true,
    message: 'Share link generated successfully',
    data: {
      shareLink,
      token: folder.permissions.shareLink!.token,
      expiresAt: folder.permissions.shareLink!.expiresAt,
      hasPassword: !!folder.permissions.shareLink!.password,
      allowUpload: folder.permissions.shareLink!.allowUpload,
    },
  });
}));

export default router;
