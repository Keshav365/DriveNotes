const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

console.log('🚀 Starting DriveNotes Server with Firebase Storage...');

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Firebase Admin SDK
let firebaseStorage;
try {
  if (process.env.FIREBASE_PROJECT_ID && 
      process.env.FIREBASE_CLIENT_EMAIL && 
      process.env.FIREBASE_PRIVATE_KEY && 
      process.env.FIREBASE_STORAGE_BUCKET) {
    
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      });
    }
    
    firebaseStorage = admin.storage();
    console.log('🔥 Firebase initialized successfully');
    console.log('📁 Storage bucket:', process.env.FIREBASE_STORAGE_BUCKET);
  } else {
    console.log('⚠️  Firebase not configured, using local storage fallback');
  }
} catch (error) {
  console.error('❌ Firebase initialization error:', error.message);
  console.log('⚠️  Falling back to local storage');
}

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3001',
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Configure multer for memory storage (Firebase upload)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    cb(null, true); // Accept all file types
  }
});

// User Schema (same as before)
const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

UserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', UserSchema);

// Enhanced File Schema for Firebase storage
const FileSchema = new mongoose.Schema({
  name: { type: String, required: true },
  originalName: { type: String, required: true },
  size: { type: Number, required: true },
  contentType: { type: String, required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  folder: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder' },
  description: String,
  tags: [String],
  // Firebase-specific fields
  firebasePath: { type: String, required: true }, // Path in Firebase Storage
  firebaseUrl: { type: String, required: true }, // Public Firebase URL
  publicUrl: { type: String, required: true }, // Direct access URL
  uploadedAt: { type: Date, default: Date.now }
});

FileSchema.methods.formatSize = function() {
  const bytes = this.size;
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const File = mongoose.model('File', FileSchema);

// Folder Schema (same as before)
const FolderSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder' },
  path: { type: String, default: '/' },
  color: { type: String, default: '#3B82F6' },
  tags: [String],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Folder = mongoose.model('Folder', FolderSchema);

// Helper Functions
const sanitizeFileName = (fileName) => {
  return fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
};

const uploadToFirebase = async (file, userId, folderId = null) => {
  if (!firebaseStorage) {
    throw new Error('Firebase storage not initialized');
  }

  const fileId = uuidv4();
  const sanitizedFileName = sanitizeFileName(file.originalname);
  const path = folderId 
    ? `users/${userId}/folders/${folderId}/${fileId}_${sanitizedFileName}`
    : `users/${userId}/${fileId}_${sanitizedFileName}`;

  const bucket = firebaseStorage.bucket();
  const fileRef = bucket.file(path);
  
  // Upload file
  const stream = fileRef.createWriteStream({
    metadata: {
      contentType: file.mimetype,
      metadata: {
        userId,
        uploadedAt: new Date().toISOString(),
        originalName: file.originalname,
      },
    },
    resumable: false,
  });

  return new Promise((resolve, reject) => {
    stream.on('error', (error) => {
      console.error('Firebase upload error:', error);
      reject(new Error('Failed to upload file to Firebase'));
    });

    stream.on('finish', async () => {
      try {
        // Make file publicly accessible
        await fileRef.makePublic();
        
        // Get public URL
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${path}`;
        
        resolve({
          firebasePath: path,
          publicUrl: publicUrl,
          firebaseUrl: publicUrl, // Same as public for now
          size: file.size,
          contentType: file.mimetype
        });
      } catch (error) {
        console.error('Error making file public:', error);
        reject(new Error('Failed to make file public'));
      }
    });

    stream.end(file.buffer);
  });
};

// Generate JWT tokens
const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { userId, type: 'access' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '15m' }
  );
  
  const refreshToken = jwt.sign(
    { userId, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
  );
  
  return { accessToken, refreshToken };
};

// Authentication middleware
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ success: false, message: 'Access token required' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'DriveNotes API with Firebase Storage is running!',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    features: ['authentication', 'firebase-storage', 'folders'],
    firebase: {
      initialized: !!firebaseStorage,
      bucket: process.env.FIREBASE_STORAGE_BUCKET || 'Not configured'
    }
  });
});

// Auth Routes (same as before)

// Register
app.post('/api/auth/register/email', async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;
    
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }
    
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists'
      });
    }
    
    const user = new User({ email, password, firstName, lastName });
    await user.save();
    
    const { accessToken, refreshToken } = generateTokens(user._id);
    
    const userData = {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isEmailVerified: user.isEmailVerified,
      createdAt: user.createdAt
    };
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: userData,
      accessToken,
      refreshToken
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed'
    });
  }
});

// Login
app.post('/api/auth/login/email', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    const { accessToken, refreshToken } = generateTokens(user._id);
    
    const userData = {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isEmailVerified: user.isEmailVerified,
      createdAt: user.createdAt
    };
    
    res.json({
      success: true,
      message: 'Login successful',
      user: userData,
      accessToken,
      refreshToken
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
});

// User Profile
app.get('/api/user/profile', authenticateToken, (req, res) => {
  res.json({
    success: true,
    data: {
      id: req.user._id,
      email: req.user.email,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      isEmailVerified: req.user.isEmailVerified,
      createdAt: req.user.createdAt
    }
  });
});

// ===============================
// FIREBASE FILE MANAGEMENT ROUTES
// ===============================

// Upload files to Firebase
app.post('/api/files/upload', authenticateToken, upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    if (!firebaseStorage) {
      return res.status(500).json({
        success: false,
        message: 'Firebase storage not configured. Please set up Firebase credentials.'
      });
    }

    const { folderId, description, tags } = req.body;
    const uploadedFiles = [];
    const failures = [];

    // Process each uploaded file
    for (const file of req.files) {
      try {
        console.log(`Uploading ${file.originalname} to Firebase...`);
        
        const firebaseResult = await uploadToFirebase(file, req.user._id, folderId);
        
        const fileDoc = new File({
          name: file.originalname.split('.')[0], // Name without extension
          originalName: file.originalname,
          size: file.size,
          contentType: file.mimetype,
          owner: req.user._id,
          folder: folderId || null,
          description: description || '',
          tags: tags ? JSON.parse(tags) : [],
          firebasePath: firebaseResult.firebasePath,
          firebaseUrl: firebaseResult.firebaseUrl,
          publicUrl: firebaseResult.publicUrl
        });

        await fileDoc.save();
        
        uploadedFiles.push({
          id: fileDoc._id,
          name: fileDoc.name,
          originalName: fileDoc.originalName,
          size: fileDoc.size,
          formattedSize: fileDoc.formatSize(),
          contentType: fileDoc.contentType,
          url: fileDoc.publicUrl,
          firebaseUrl: fileDoc.firebaseUrl,
          uploadedAt: fileDoc.uploadedAt
        });

        console.log(`✅ Successfully uploaded: ${file.originalname}`);

      } catch (error) {
        console.error('Error uploading file:', error);
        failures.push({
          filename: file.originalname,
          error: error.message || 'Upload failed'
        });
      }
    }

    res.status(201).json({
      success: true,
      message: `${uploadedFiles.length} file(s) uploaded successfully to Firebase`,
      data: {
        files: uploadedFiles,
        failures,
        summary: {
          success: uploadedFiles.length,
          failed: failures.length,
          total: req.files.length
        },
        storage: 'Firebase Storage'
      }
    });

  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({
      success: false,
      message: 'File upload failed'
    });
  }
});

// Get files (same as before but with Firebase URLs)
app.get('/api/files', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, folderId, search, type, sortBy = 'uploadedAt', sortOrder = 'desc' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const query = { owner: req.user._id };
    
    if (folderId) {
      query.folder = folderId === 'null' ? null : folderId;
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { originalName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (type && type !== 'all') {
      const typeMap = {
        image: /^image\//,
        document: /^application\/(pdf|msword|vnd\.openxmlformats-officedocument)/,
        video: /^video\//,
        audio: /^audio\//,
        archive: /^application\/(zip|x-rar|x-tar)/
      };
      
      if (typeMap[type]) {
        query.contentType = typeMap[type];
      }
    }
    
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    const files = await File.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('owner', 'firstName lastName email')
      .populate('folder', 'name');
    
    const total = await File.countDocuments(query);
    
    res.json({
      success: true,
      data: {
        files: files.map(file => ({
          id: file._id,
          name: file.name,
          originalName: file.originalName,
          size: file.size,
          formattedSize: file.formatSize(),
          contentType: file.contentType,
          url: file.publicUrl, // Firebase public URL
          firebaseUrl: file.firebaseUrl,
          owner: file.owner,
          folder: file.folder,
          description: file.description,
          tags: file.tags,
          uploadedAt: file.uploadedAt,
          storage: 'Firebase Storage'
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        },
        storage: {
          type: 'Firebase Storage',
          bucket: process.env.FIREBASE_STORAGE_BUCKET
        }
      }
    });
  } catch (error) {
    console.error('Get files error:', error);
    res.status(500).json({ success: false, message: 'Failed to get files' });
  }
});

// Delete file from Firebase
app.delete('/api/files/:id', authenticateToken, async (req, res) => {
  try {
    const file = await File.findOne({ _id: req.params.id, owner: req.user._id });
    
    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }
    
    // Delete from Firebase Storage
    try {
      if (firebaseStorage && file.firebasePath) {
        const bucket = firebaseStorage.bucket();
        const fileRef = bucket.file(file.firebasePath);
        await fileRef.delete();
        console.log(`🗑️ Deleted from Firebase: ${file.firebasePath}`);
      }
    } catch (error) {
      console.error('Error deleting from Firebase:', error);
    }
    
    // Delete from database
    await File.findByIdAndDelete(req.params.id);
    
    res.json({
      success: true,
      message: 'File deleted successfully from Firebase Storage'
    });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete file' });
  }
});

// Folders routes (same as before)
app.get('/api/folders', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, parentId, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const query = { owner: req.user._id };
    if (parentId) {
      query.parent = parentId === 'null' ? null : parentId;
    }
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    
    const folders = await Folder.find(query)
      .sort({ name: 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('owner', 'firstName lastName email');
    
    const total = await Folder.countDocuments(query);
    
    res.json({
      success: true,
      data: {
        folders,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get folders error:', error);
    res.status(500).json({ success: false, message: 'Failed to get folders' });
  }
});

app.post('/api/folders', authenticateToken, async (req, res) => {
  try {
    const { name, description, parentId, color, tags } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Folder name is required'
      });
    }
    
    const existingFolder = await Folder.findOne({
      name,
      owner: req.user._id,
      parent: parentId || null
    });
    
    if (existingFolder) {
      return res.status(400).json({
        success: false,
        message: 'Folder with this name already exists'
      });
    }
    
    const folder = new Folder({
      name,
      description,
      owner: req.user._id,
      parent: parentId || null,
      color: color || '#3B82F6',
      tags: tags || []
    });
    
    await folder.save();
    
    res.status(201).json({
      success: true,
      message: 'Folder created successfully',
      data: folder
    });
    
  } catch (error) {
    console.error('Create folder error:', error);
    res.status(500).json({ success: false, message: 'Failed to create folder' });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route not found' 
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// Connect to MongoDB and start server
async function startServer() {
  try {
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    console.log('✅ Connected to MongoDB');
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
      console.log(`📱 Client URL: ${process.env.CLIENT_URL || 'http://localhost:3000'}`);
      console.log(`🔥 Firebase Storage: ${firebaseStorage ? '✅ Ready' : '❌ Not configured'}`);
      console.log('📚 API Documentation: See API_DOCUMENTATION.md');
      console.log('');
      console.log('✨ Ready to accept requests with Firebase Storage!');
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n⏹️  Shutting down gracefully...');
  await mongoose.disconnect();
  console.log('✅ Database disconnected');
  process.exit(0);
});

process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled Rejection:', error);
});

// Start the server
startServer();
