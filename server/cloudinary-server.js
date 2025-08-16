const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { v4: uuidv4 } = require('uuid');
const { OAuth2Client } = require('google-auth-library');
const dotenv = require('dotenv');

// AI providers
const OpenAI = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Anthropic = require('@anthropic-ai/sdk');

// Load environment variables
dotenv.config();

console.log('🚀 Starting DriveNotes Server with Cloudinary Storage (25GB FREE)...');

const app = express();
const PORT = process.env.PORT || 5001;

// Initialize Google OAuth client
const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.CLIENT_URL || 'http://localhost:3001'}/auth/google/callback`
);

console.log('🔐 Google OAuth initialized:', !!process.env.GOOGLE_CLIENT_ID);

// Initialize Cloudinary
let cloudinaryConfigured = false;
try {
  if (process.env.CLOUDINARY_CLOUD_NAME && 
      process.env.CLOUDINARY_API_KEY && 
      process.env.CLOUDINARY_API_SECRET) {
    
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    
    cloudinaryConfigured = true;
    console.log('☁️  Cloudinary initialized successfully');
    console.log('📁 Cloud name:', process.env.CLOUDINARY_CLOUD_NAME);
  } else {
    console.log('⚠️  Cloudinary not configured, using local storage fallback');
  }
} catch (error) {
  console.error('❌ Cloudinary initialization error:', error.message);
  console.log('⚠️  Falling back to local storage');
}

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Configure multer with Cloudinary storage
let upload;

// Create a function to get multer upload for authenticated requests
const createAuthenticatedUpload = (req) => {
  if (cloudinaryConfigured) {
    // Cloudinary storage configuration with user context
    const storage = new CloudinaryStorage({
      cloudinary: cloudinary,
      params: async (req, file) => {
        const userId = req.user._id;
        const folderId = req.body.folderId;
        
        // Create folder structure in Cloudinary
        const folder = folderId 
          ? `drivenotes/${userId}/folders/${folderId}`
          : `drivenotes/${userId}`;
        
        return {
          folder: folder,
          public_id: `${uuidv4()}_${file.originalname.split('.')[0]}`,
          resource_type: 'auto', // Auto-detect file type
          access_mode: 'public',
          use_filename: true,
          unique_filename: true,
        };
      },
    });
    
    return multer({
      storage: storage,
      limits: {
        fileSize: 100 * 1024 * 1024, // 100MB limit
      },
    });
  } else {
    // Fallback to memory storage
    return multer({
      storage: multer.memoryStorage(),
      limits: {
        fileSize: 100 * 1024 * 1024, // 100MB limit
      },
    });
  }
};

// User Schema
const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: function() {
      return !this.googleId; // Password not required for Google users
    },
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
  // Google OAuth fields
  googleId: {
    type: String,
    unique: true,
    sparse: true // Allows null values while maintaining uniqueness
  },
  picture: {
    type: String // Google profile picture URL
  },
  provider: {
    type: String,
    enum: ['email', 'google'],
    default: 'email'
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  // Storage tracking
  storage: {
    used: {
      type: Number,
      default: 0
    },
    limit: {
      type: Number,
      default: 5 * 1024 * 1024 * 1024 // 5GB default
    }
  },
  // Google Calendar integration
  calendar: {
    enabled: {
      type: Boolean,
      default: false
    },
    apiKey: {
      type: String,
      default: null
    },
    calendarId: {
      type: String,
      default: 'primary'
    },
    refreshToken: {
      type: String,
      default: null
    },
    accessToken: {
      type: String,
      default: null
    },
    tokenExpiryDate: {
      type: Date,
      default: null
    },
    preferences: {
      showOnDashboard: {
        type: Boolean,
        default: true
      },
      maxEvents: {
        type: Number,
        default: 10
      },
      daysToShow: {
        type: Number,
        default: 7
      },
      // Event type toggles
      showHolidays: {
        type: Boolean,
        default: true
      },
      showSecondaryCalendars: {
        type: Boolean,
        default: true
      },
      showAllDayEvents: {
        type: Boolean,
        default: true
      },
      showPastEvents: {
        type: Boolean,
        default: false
      },
      showOngoingEvents: {
        type: Boolean,
        default: true
      },
      showUpcomingEvents: {
        type: Boolean,
        default: true
      },
      // Holiday country preference
      holidayCountry: {
        type: String,
        default: 'US' // US, GB, CA, AU, DE, FR, ES, IT, JP, IN, CN, BR, RU, KR, NL
      },
      // Display preferences
      showEventDescriptions: {
        type: Boolean,
        default: true
      },
      showEventLocations: {
        type: Boolean,
        default: true
      },
      showAttendeeCount: {
        type: Boolean,
        default: false
      },
      // Time preferences
      timeFormat: {
        type: String,
        enum: ['12h', '24h'],
        default: '12h'
      },
      timezone: {
        type: String,
        default: 'UTC'
      },
      // Event filtering
      hideDeclinedEvents: {
        type: Boolean,
        default: true
      },
      hideCancelledEvents: {
        type: Boolean,
        default: true
      },
      // Calendar color preferences
      useCalendarColors: {
        type: Boolean,
        default: true
      },
      // Notification preferences
      showEventReminders: {
        type: Boolean,
        default: false
      }
    }
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

// Enhanced File Schema for Cloudinary storage
const FileSchema = new mongoose.Schema({
  name: { type: String, required: true },
  originalName: { type: String, required: true },
  size: { type: Number, required: true },
  contentType: { type: String, required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  folder: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder' },
  description: String,
  tags: [String],
  // Cloudinary-specific fields
  cloudinaryId: { type: String, required: true }, // Cloudinary public_id
  cloudinaryUrl: { type: String, required: true }, // Cloudinary URL
  cloudinarySecureUrl: { type: String, required: true }, // HTTPS URL
  cloudinaryFolder: String, // Folder in Cloudinary
  resourceType: String, // image, video, raw, auto
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

// Folder Schema
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

// Note Schema
const NoteSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 255
  },
  content: {
    type: String,
    required: true,
    maxlength: 10000
  },
  color: {
    type: String,
    enum: ['#ffffff', '#fef3c7', '#d1fae5', '#dbeafe', '#e9d5ff', '#fce7f3', '#fee2e2', '#fed7aa', '#f3f4f6'],
    default: '#ffffff'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  position: {
    type: Number,
    default: 0
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: 50
  }],
  archived: {
    type: Boolean,
    default: false
  },
  pinned: {
    type: Boolean,
    default: false
  },
  reminder: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes for performance
NoteSchema.index({ userId: 1, createdAt: -1 });
NoteSchema.index({ userId: 1, pinned: -1, position: 1 });
NoteSchema.index({ userId: 1, archived: 1 });
NoteSchema.index({ userId: 1, reminder: 1 });
NoteSchema.index({ tags: 1 });

// Text search index
NoteSchema.index({
  title: 'text',
  content: 'text',
  tags: 'text'
});

const Note = mongoose.model('Note', NoteSchema);

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
    message: 'DriveNotes API with Cloudinary Storage is running!',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    features: ['authentication', 'cloudinary-storage', 'folders', 'notes', 'google-calendar'],
    storage: {
      provider: 'Cloudinary',
      configured: cloudinaryConfigured,
      freeTier: '25GB storage + 25GB bandwidth/month',
      cloudName: process.env.CLOUDINARY_CLOUD_NAME || 'Not configured'
    }
  });
});

// Auth Routes

// Register
app.post('/api/auth/register/email', async (req, res) => {
  try {
    console.log('🔍 Registration request received:', req.body);
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

// Google OAuth Login
app.post('/api/auth/google', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Google token is required'
      });
    }

    // Verify the Google token
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const {
      sub: googleId,
      email,
      given_name: firstName,
      family_name: lastName,
      picture,
      email_verified
    } = payload;

    // Check if user already exists
    let user = await User.findOne({ $or: [{ googleId }, { email }] });

    if (user) {
      // Update existing user with Google info if not already set
      if (!user.googleId) {
        user.googleId = googleId;
        user.picture = picture;
        user.provider = 'google';
        user.isEmailVerified = email_verified || user.isEmailVerified;
        await user.save();
      }
    } else {
      // Create new user
      user = new User({
        email,
        firstName,
        lastName: lastName || '',
        googleId,
        picture,
        provider: 'google',
        isEmailVerified: email_verified || false
      });
      await user.save();
    }

    const { accessToken, refreshToken } = generateTokens(user._id);
    
    const userData = {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      picture: user.picture,
      provider: user.provider,
      isEmailVerified: user.isEmailVerified,
      createdAt: user.createdAt
    };
    
    res.json({
      success: true,
      message: 'Google login successful',
      user: userData,
      accessToken,
      refreshToken
    });
    
  } catch (error) {
    console.error('Google OAuth error:', error);
    res.status(500).json({
      success: false,
      message: 'Google authentication failed'
    });
  }
});

// User Profile
app.get('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    // Fetch fresh user data from database to include storage field
    const user = await User.findById(req.user._id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      data: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        picture: user.picture,
        provider: user.provider,
        isEmailVerified: user.isEmailVerified,
        storage: user.storage,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get profile'
    });
  }
});

// ===============================
// CLOUDINARY FILE MANAGEMENT ROUTES
// ===============================

// Upload files to Cloudinary
app.post('/api/files/upload', authenticateToken, (req, res, next) => {
  const upload = createAuthenticatedUpload(req);
  upload.array('files', 10)(req, res, next);
}, async (req, res) => {
  try {
    console.log('🔍 File upload request received');
    console.log('📁 Files:', req.files ? req.files.length : 0);
    console.log('📝 Body:', req.body);
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    if (!cloudinaryConfigured) {
      return res.status(500).json({
        success: false,
        message: 'Cloudinary not configured. Please set up Cloudinary credentials for 25GB FREE storage.'
      });
    }

    const { folderId, description, tags } = req.body;
    const uploadedFiles = [];
    const failures = [];

    // Process each uploaded file
    for (const file of req.files) {
      try {
        console.log(`✅ Uploaded ${file.originalname} to Cloudinary`);
        
        const fileDoc = new File({
          name: file.originalname.split('.')[0], // Name without extension
          originalName: file.originalname,
          size: file.size,
          contentType: file.mimetype,
          owner: req.user._id,
          folder: folderId || null,
          description: description || '',
          tags: tags ? JSON.parse(tags) : [],
          cloudinaryId: file.filename, // Cloudinary public_id
          cloudinaryUrl: file.path, // Cloudinary URL
          cloudinarySecureUrl: file.path.replace('http://', 'https://'),
          cloudinaryFolder: file.folder || '',
          resourceType: file.resource_type || 'auto'
        });

        await fileDoc.save();
        
        uploadedFiles.push({
          id: fileDoc._id,
          name: fileDoc.name,
          originalName: fileDoc.originalName,
          size: fileDoc.size,
          formattedSize: fileDoc.formatSize(),
          contentType: fileDoc.contentType,
          url: fileDoc.cloudinarySecureUrl,
          cloudinaryId: fileDoc.cloudinaryId,
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

    // Update user storage usage
    if (uploadedFiles.length > 0) {
      const totalUploadedSize = uploadedFiles.reduce((total, file) => total + file.size, 0);
      await User.findByIdAndUpdate(req.user._id, {
        $inc: { 'storage.used': totalUploadedSize }
      });
    }

    res.status(201).json({
      success: true,
      message: `${uploadedFiles.length} file(s) uploaded successfully to Cloudinary`,
      data: {
        files: uploadedFiles,
        failures,
        summary: {
          success: uploadedFiles.length,
          failed: failures.length,
          total: req.files.length
        },
        storage: 'Cloudinary (25GB FREE)'
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

// Get files
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
          url: file.cloudinarySecureUrl, // Cloudinary HTTPS URL
          cloudinaryId: file.cloudinaryId,
          owner: file.owner,
          folder: file.folder,
          description: file.description,
          tags: file.tags,
          uploadedAt: file.uploadedAt,
          storage: 'Cloudinary'
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        },
        storage: {
          type: 'Cloudinary',
          freeTier: '25GB storage + 25GB bandwidth/month',
          cloudName: process.env.CLOUDINARY_CLOUD_NAME
        }
      }
    });
  } catch (error) {
    console.error('Get files error:', error);
    res.status(500).json({ success: false, message: 'Failed to get files' });
  }
});

// Delete file from Cloudinary
app.delete('/api/files/:id', authenticateToken, async (req, res) => {
  try {
    const file = await File.findOne({ _id: req.params.id, owner: req.user._id });
    
    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }
    
    // Delete from Cloudinary
    try {
      if (cloudinaryConfigured && file.cloudinaryId) {
        await cloudinary.uploader.destroy(file.cloudinaryId, { 
          resource_type: file.resourceType || 'auto' 
        });
        console.log(`🗑️ Deleted from Cloudinary: ${file.cloudinaryId}`);
      }
    } catch (error) {
      console.error('Error deleting from Cloudinary:', error);
    }
    
    // Update user storage usage before deleting
    const fileSize = file.size;
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { 'storage.used': -fileSize }
    });
    
    // Delete from database
    await File.findByIdAndDelete(req.params.id);
    
    res.json({
      success: true,
      message: 'File deleted successfully from Cloudinary'
    });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete file' });
  }
});

// Folders routes
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

// Get specific folder with contents
app.get('/api/folders/:id', authenticateToken, async (req, res) => {
  try {
    const folder = await Folder.findOne({ 
      _id: req.params.id, 
      owner: req.user._id 
    }).populate('owner', 'firstName lastName email');
    
    if (!folder) {
      return res.status(404).json({
        success: false,
        message: 'Folder not found'
      });
    }
    
    // Get subfolders
    const subfolders = await Folder.find({ 
      parent: folder._id, 
      owner: req.user._id 
    }).sort({ name: 1 });
    
    // Get files in this folder
    const files = await File.find({ 
      folder: folder._id, 
      owner: req.user._id 
    }).sort({ uploadedAt: -1 });
    
    // Calculate folder statistics
    const totalFiles = await File.countDocuments({ folder: folder._id, owner: req.user._id });
    const totalSize = await File.aggregate([
      { $match: { folder: folder._id, owner: req.user._id } },
      { $group: { _id: null, totalSize: { $sum: '$size' } } }
    ]);
    
    const folderData = {
      id: folder._id,
      name: folder.name,
      description: folder.description,
      parentId: folder.parent,
      color: folder.color,
      tags: folder.tags,
      fileCount: totalFiles,
      totalSize: totalSize[0]?.totalSize || 0,
      formattedSize: formatBytes(totalSize[0]?.totalSize || 0),
      createdAt: folder.createdAt,
      lastModified: folder.updatedAt
    };
    
    // Format files for response
    const formattedFiles = files.map(file => ({
      id: file._id,
      name: file.name,
      originalName: file.originalName,
      size: file.size,
      formattedSize: file.formatSize(),
      mimeType: file.contentType,
      url: file.cloudinarySecureUrl,
      uploadedAt: file.uploadedAt,
      folderId: file.folder
    }));
    
    // Format subfolders for response
    const formattedSubfolders = subfolders.map(subfolder => ({
      id: subfolder._id,
      name: subfolder.name,
      description: subfolder.description,
      color: subfolder.color,
      fileCount: 0, // Will be calculated if needed
      totalSize: 0,
      formattedSize: '0 Bytes',
      createdAt: subfolder.createdAt,
      lastModified: subfolder.updatedAt,
      parentId: subfolder.parent
    }));
    
    res.json({
      success: true,
      data: {
        folder: folderData,
        contents: {
          files: formattedFiles,
          subfolders: formattedSubfolders
        }
      }
    });
    
  } catch (error) {
    console.error('Get folder error:', error);
    res.status(500).json({ success: false, message: 'Failed to get folder' });
  }
});

// Update folder
app.put('/api/folders/:id', authenticateToken, async (req, res) => {
  try {
    const { name, description, color, tags } = req.body;
    
    const folder = await Folder.findOne({ 
      _id: req.params.id, 
      owner: req.user._id 
    });
    
    if (!folder) {
      return res.status(404).json({
        success: false,
        message: 'Folder not found'
      });
    }
    
    // Check for duplicate names if name is being changed
    if (name && name !== folder.name) {
      const existingFolder = await Folder.findOne({
        name,
        owner: req.user._id,
        parent: folder.parent,
        _id: { $ne: folder._id }
      });
      
      if (existingFolder) {
        return res.status(400).json({
          success: false,
          message: 'Folder with this name already exists'
        });
      }
    }
    
    // Update folder
    const updatedFolder = await Folder.findByIdAndUpdate(
      req.params.id,
      {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(color && { color }),
        ...(tags && { tags }),
        updatedAt: new Date()
      },
      { new: true }
    );
    
    res.json({
      success: true,
      message: 'Folder updated successfully',
      data: updatedFolder
    });
    
  } catch (error) {
    console.error('Update folder error:', error);
    res.status(500).json({ success: false, message: 'Failed to update folder' });
  }
});

// Delete folder
app.delete('/api/folders/:id', authenticateToken, async (req, res) => {
  try {
    const { force } = req.query;
    
    const folder = await Folder.findOne({ 
      _id: req.params.id, 
      owner: req.user._id 
    });
    
    if (!folder) {
      return res.status(404).json({
        success: false,
        message: 'Folder not found'
      });
    }
    
    // Check if folder has contents
    const filesCount = await File.countDocuments({ folder: folder._id, owner: req.user._id });
    const subfoldersCount = await Folder.countDocuments({ parent: folder._id, owner: req.user._id });
    
    if ((filesCount > 0 || subfoldersCount > 0) && !force) {
      return res.status(400).json({
        success: false,
        message: 'Folder is not empty. Use force=true to delete non-empty folder.'
      });
    }
    
    if (force) {
      // Delete all files in folder (and from Cloudinary)
      const files = await File.find({ folder: folder._id, owner: req.user._id });
      for (const file of files) {
        try {
          if (cloudinaryConfigured && file.cloudinaryId) {
            await cloudinary.uploader.destroy(file.cloudinaryId, { 
              resource_type: file.resourceType || 'auto' 
            });
          }
        } catch (error) {
          console.error('Error deleting file from Cloudinary:', error);
        }
      }
      
      // Delete files from database and update storage
      const totalFilesSize = await File.aggregate([
        { $match: { folder: folder._id, owner: req.user._id } },
        { $group: { _id: null, totalSize: { $sum: '$size' } } }
      ]);
      
      await File.deleteMany({ folder: folder._id, owner: req.user._id });
      
      // Update user storage
      const deletedSize = totalFilesSize[0]?.totalSize || 0;
      if (deletedSize > 0) {
        await User.findByIdAndUpdate(req.user._id, {
          $inc: { 'storage.used': -deletedSize }
        });
      }
      
      // Delete subfolders recursively
      await deleteSubfoldersRecursively(folder._id, req.user._id);
    }
    
    // Delete the folder itself
    await Folder.findByIdAndDelete(req.params.id);
    
    res.json({
      success: true,
      message: 'Folder deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete folder error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete folder' });
  }
});

// Helper function to delete subfolders recursively
async function deleteSubfoldersRecursively(parentId, ownerId) {
  const subfolders = await Folder.find({ parent: parentId, owner: ownerId });
  
  for (const subfolder of subfolders) {
    // Delete files in subfolder
    const files = await File.find({ folder: subfolder._id, owner: ownerId });
    for (const file of files) {
      try {
        if (cloudinaryConfigured && file.cloudinaryId) {
          await cloudinary.uploader.destroy(file.cloudinaryId, { 
            resource_type: file.resourceType || 'auto' 
          });
        }
      } catch (error) {
        console.error('Error deleting file from Cloudinary:', error);
      }
    }
    
    // Delete files from database
    await File.deleteMany({ folder: subfolder._id, owner: ownerId });
    
    // Recursively delete nested subfolders
    await deleteSubfoldersRecursively(subfolder._id, ownerId);
    
    // Delete the subfolder
    await Folder.findByIdAndDelete(subfolder._id);
  }
}

// ===============================
// GOOGLE CALENDAR API ROUTES
// ===============================

// Get user's calendar settings
app.get('/api/calendar/settings', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('calendar');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Don't return sensitive tokens in the response
    const settings = {
      enabled: user.calendar?.enabled || false,
      calendarId: user.calendar?.calendarId || 'primary',
      preferences: user.calendar?.preferences || {
        showOnDashboard: true,
        maxEvents: 10,
        daysToShow: 7
      },
      hasApiKey: !!(user.calendar?.apiKey),
      hasTokens: !!(user.calendar?.accessToken && user.calendar?.refreshToken)
    };
    
    res.json({
      success: true,
      data: settings
    });
    
  } catch (error) {
    console.error('Get calendar settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get calendar settings'
    });
  }
});

// Update user's calendar settings
app.put('/api/calendar/settings', authenticateToken, async (req, res) => {
  try {
    const { enabled, apiKey, calendarId, preferences } = req.body;
    
    const updateFields = {};
    
    if (enabled !== undefined) updateFields['calendar.enabled'] = enabled;
    if (apiKey !== undefined) updateFields['calendar.apiKey'] = apiKey;
    if (calendarId !== undefined) updateFields['calendar.calendarId'] = calendarId;
    if (preferences !== undefined) updateFields['calendar.preferences'] = preferences;
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updateFields },
      { new: true }
    ).select('calendar');
    
    // Return safe settings (no sensitive tokens)
    const settings = {
      enabled: user.calendar?.enabled || false,
      calendarId: user.calendar?.calendarId || 'primary',
      preferences: user.calendar?.preferences || {
        showOnDashboard: true,
        maxEvents: 10,
        daysToShow: 7
      },
      hasApiKey: !!(user.calendar?.apiKey),
      hasTokens: !!(user.calendar?.accessToken && user.calendar?.refreshToken)
    };
    
    res.json({
      success: true,
      message: 'Calendar settings updated successfully',
      data: settings
    });
    
  } catch (error) {
    console.error('Update calendar settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update calendar settings'
    });
  }
});

// Initialize Google Calendar OAuth flow
app.post('/api/calendar/auth/init', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Use the backend URL as the redirect URI since we'll handle the callback on the server
    const redirectUri = `${process.env.SERVER_URL || 'http://localhost:5001'}/api/calendar/auth/callback`;
    
    // Create OAuth2 client for Calendar API
    const oauth2Client = new googleClient.constructor(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      redirectUri
    );
    
    const scopes = [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events'
    ];
    
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: user._id.toString(), // Include user ID in state
      prompt: 'consent' // Force consent screen to get refresh token
    });
    
    res.json({
      success: true,
      authUrl
    });
    
  } catch (error) {
    console.error('Calendar auth init error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initialize calendar authentication'
    });
  }
});

// Actual Google Calendar OAuth callback endpoint (GET request from Google)
app.get('/api/calendar/auth/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    
    if (!code) {
      return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/settings?error=no_code`);
    }
    
    if (!state) {
      return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/settings?error=no_state`);
    }
    
    // Use the backend URL as the redirect URI
    const redirectUri = `${process.env.SERVER_URL || 'http://localhost:5001'}/api/calendar/auth/callback`;
    
    const oauth2Client = new googleClient.constructor(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      redirectUri
    );
    
    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    
    // Store tokens in user document (state contains user ID)
    await User.findByIdAndUpdate(state, {
      $set: {
        'calendar.accessToken': tokens.access_token,
        'calendar.refreshToken': tokens.refresh_token,
        'calendar.tokenExpiryDate': new Date(tokens.expiry_date),
        'calendar.enabled': true
      }
    });
    
    // Redirect back to frontend with success
    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/settings?calendar_auth=success`);
    
  } catch (error) {
    console.error('Calendar auth callback error:', error);
    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/settings?error=auth_failed`);
  }
});

// Handle Google Calendar OAuth callback (POST version for frontend processing)
app.post('/api/calendar/auth/callback', authenticateToken, async (req, res) => {
  try {
    const { code, state } = req.body;
    
    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Authorization code required'
      });
    }
    
    // Verify state matches current user
    if (state !== req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid state parameter'
      });
    }
    
    const redirectUri = `${process.env.SERVER_URL || 'http://localhost:5001'}/api/calendar/auth/callback`;
    
    const oauth2Client = new googleClient.constructor(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      redirectUri
    );
    
    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    
    // Store tokens in user document
    await User.findByIdAndUpdate(req.user._id, {
      $set: {
        'calendar.accessToken': tokens.access_token,
        'calendar.refreshToken': tokens.refresh_token,
        'calendar.tokenExpiryDate': new Date(tokens.expiry_date),
        'calendar.enabled': true
      }
    });
    
    res.json({
      success: true,
      message: 'Calendar authentication successful'
    });
    
  } catch (error) {
    console.error('Calendar auth callback error:', error);
    res.status(500).json({
      success: false,
      message: 'Calendar authentication failed'
    });
  }
});

// Get calendar events from multiple sources
app.get('/api/calendar/events', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user || !user.calendar?.enabled || !user.calendar?.accessToken) {
      return res.status(400).json({
        success: false,
        message: 'Calendar not configured or not enabled'
      });
    }
    
    // Get user preferences with defaults
    const prefs = user.calendar?.preferences || {};
    const {
      daysToShow = prefs.daysToShow || 7,
      maxResults = prefs.maxEvents || 50,
      includeHolidays = prefs.showHolidays !== false ? 'true' : 'false'
    } = req.query;
    
    // Get country code for holidays
    const holidayCountryMap = {
      'US': 'en.usa#holiday@group.v.calendar.google.com',
      'GB': 'en.uk#holiday@group.v.calendar.google.com',
      'CA': 'en.canadian#holiday@group.v.calendar.google.com',
      'AU': 'en.australian#holiday@group.v.calendar.google.com',
      'DE': 'de.german#holiday@group.v.calendar.google.com',
      'FR': 'fr.french#holiday@group.v.calendar.google.com',
      'ES': 'es.spanish#holiday@group.v.calendar.google.com',
      'IT': 'it.italian#holiday@group.v.calendar.google.com',
      'JP': 'ja.japanese#holiday@group.v.calendar.google.com',
      'IN': 'en.indian#holiday@group.v.calendar.google.com',
      'CN': 'zh.chinese#holiday@group.v.calendar.google.com',
      'BR': 'pt.brazilian#holiday@group.v.calendar.google.com',
      'RU': 'ru.russian#holiday@group.v.calendar.google.com',
      'KR': 'ko.south_korean#holiday@group.v.calendar.google.com',
      'NL': 'nl.dutch#holiday@group.v.calendar.google.com'
    };
    
    const selectedHolidayCalendar = holidayCountryMap[prefs.holidayCountry || 'US'] || holidayCountryMap['US'];
    
    // Create OAuth2 client and set credentials
    const oauth2Client = new googleClient.constructor(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    
    oauth2Client.setCredentials({
      access_token: user.calendar.accessToken,
      refresh_token: user.calendar.refreshToken
    });
    
    // Set time range
    const timeMin = new Date();
    const timeMax = new Date();
    timeMax.setDate(timeMax.getDate() + parseInt(daysToShow));
    
    let allEvents = [];
    let refreshedToken = null;
    
    // Function to make API call with token refresh handling
    const makeCalendarRequest = async (calendarId, token = user.calendar.accessToken) => {
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?` +
        new URLSearchParams({
          timeMin: timeMin.toISOString(),
          timeMax: timeMax.toISOString(),
          singleEvents: 'true',
          orderBy: 'startTime',
          maxResults: maxResults.toString()
        }),
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      if (!response.ok) {
        // Try to refresh token if expired
        if (response.status === 401 && user.calendar.refreshToken && !refreshedToken) {
          try {
            const { credentials } = await oauth2Client.refreshAccessToken();
            refreshedToken = credentials.access_token;
            
            // Update stored tokens
            await User.findByIdAndUpdate(req.user._id, {
              $set: {
                'calendar.accessToken': credentials.access_token,
                'calendar.tokenExpiryDate': new Date(credentials.expiry_date)
              }
            });
            
            // Retry with new token
            return makeCalendarRequest(calendarId, refreshedToken);
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError);
            throw new Error('Token refresh failed');
          }
        }
        throw new Error(`API request failed: ${response.status}`);
      }
      
      return response.json();
    };
    
    try {
      // 1. Fetch events from user's primary calendar
      console.log('Fetching primary calendar events...');
      const primaryCalendarData = await makeCalendarRequest(user.calendar.calendarId || 'primary');
      
      if (primaryCalendarData.items) {
        allEvents.push(...primaryCalendarData.items.map(event => ({
          ...event,
          calendarType: 'primary',
          calendarName: 'Primary Calendar'
        })));
      }
      
      // 2. Fetch holidays if enabled
      if (includeHolidays === 'true') {
        try {
          console.log('Fetching holiday events...');
          // Get user's country for holidays (default to US)
          const holidayCalendarId = 'en.usa#holiday@group.v.calendar.google.com';
          const holidayData = await makeCalendarRequest(holidayCalendarId, refreshedToken || user.calendar.accessToken);
          
          if (holidayData.items) {
            allEvents.push(...holidayData.items.map(event => ({
              ...event,
              calendarType: 'holiday',
              calendarName: 'Holidays',
              isHoliday: true
            })));
          }
        } catch (holidayError) {
          console.log('Could not fetch holidays:', holidayError.message);
          // Don't fail the entire request if holidays can't be fetched
        }
      }
      
      // 3. Fetch events from other calendars the user has access to
      try {
        console.log('Fetching calendar list...');
        const calendarListResponse = await fetch(
          'https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=reader',
          {
            headers: {
              'Authorization': `Bearer ${refreshedToken || user.calendar.accessToken}`
            }
          }
        );
        
        if (calendarListResponse.ok) {
          const calendarList = await calendarListResponse.json();
          
          // Fetch events from other calendars (limit to 5 additional calendars to avoid quota issues)
          const otherCalendars = calendarList.items
            ?.filter(cal => 
              cal.id !== (user.calendar.calendarId || 'primary') && 
              cal.id !== 'en.usa#holiday@group.v.calendar.google.com' &&
              cal.accessRole && 
              (cal.accessRole === 'owner' || cal.accessRole === 'reader' || cal.accessRole === 'writer')
            )
            ?.slice(0, 5) || [];
          
          for (const calendar of otherCalendars) {
            try {
              console.log(`Fetching events from ${calendar.summary}...`);
              const calendarData = await makeCalendarRequest(calendar.id, refreshedToken || user.calendar.accessToken);
              
              if (calendarData.items) {
                allEvents.push(...calendarData.items.map(event => ({
                  ...event,
                  calendarType: 'secondary',
                  calendarName: calendar.summary || calendar.id,
                  calendarColor: calendar.backgroundColor || '#4285f4'
                })));
              }
            } catch (calError) {
              console.log(`Could not fetch events from ${calendar.summary}:`, calError.message);
              // Continue with other calendars
            }
          }
        }
      } catch (listError) {
        console.log('Could not fetch calendar list:', listError.message);
        // Don't fail the entire request
      }
      
      // Sort all events by start time
      allEvents.sort((a, b) => {
        const aStart = a.start?.dateTime || a.start?.date || '';
        const bStart = b.start?.dateTime || b.start?.date || '';
        return new Date(aStart).getTime() - new Date(bStart).getTime();
      });
      
      // Limit total results
      const limitedEvents = allEvents.slice(0, parseInt(maxResults));
      
      // Enhance events with additional metadata
      const enhancedEvents = limitedEvents.map(event => {
        const startTime = event.start?.dateTime || event.start?.date;
        const endTime = event.end?.dateTime || event.end?.date;
        const isAllDay = !event.start?.dateTime; // All-day events don't have dateTime
        const now = new Date();
        const eventStart = new Date(startTime);
        const eventEnd = new Date(endTime);
        
        return {
          id: event.id,
          summary: event.summary || '(No title)',
          description: event.description || '',
          location: event.location || '',
          start: {
            dateTime: event.start?.dateTime,
            date: event.start?.date,
            timeZone: event.start?.timeZone
          },
          end: {
            dateTime: event.end?.dateTime,
            date: event.end?.date,
            timeZone: event.end?.timeZone
          },
          isAllDay,
          status: event.status || 'confirmed',
          calendarType: event.calendarType || 'primary',
          calendarName: event.calendarName || 'Calendar',
          calendarColor: event.calendarColor,
          isHoliday: event.isHoliday || false,
          isUpcoming: eventStart > now,
          isOngoing: eventStart <= now && eventEnd > now,
          isPast: eventEnd <= now,
          attendees: event.attendees?.length || 0,
          organizer: event.organizer,
          htmlLink: event.htmlLink,
          created: event.created,
          updated: event.updated,
          // Add response status for filtering
          attendanceStatus: event.attendees?.find(a => a.self)?.responseStatus || null
        };
      });
      
      // Apply user preference filters
      let filteredEvents = enhancedEvents;
      
      // Filter by event types based on preferences
      if (!prefs.showHolidays) {
        filteredEvents = filteredEvents.filter(e => !e.isHoliday);
      }
      
      if (!prefs.showSecondaryCalendars) {
        filteredEvents = filteredEvents.filter(e => e.calendarType !== 'secondary');
      }
      
      if (!prefs.showAllDayEvents) {
        filteredEvents = filteredEvents.filter(e => !e.isAllDay);
      }
      
      if (!prefs.showPastEvents) {
        filteredEvents = filteredEvents.filter(e => !e.isPast);
      }
      
      if (!prefs.showOngoingEvents) {
        filteredEvents = filteredEvents.filter(e => !e.isOngoing);
      }
      
      if (!prefs.showUpcomingEvents) {
        filteredEvents = filteredEvents.filter(e => !e.isUpcoming);
      }
      
      // Filter declined events if preference is set
      if (prefs.hideDeclinedEvents) {
        filteredEvents = filteredEvents.filter(e => e.attendanceStatus !== 'declined');
      }
      
      // Filter cancelled events if preference is set
      if (prefs.hideCancelledEvents) {
        filteredEvents = filteredEvents.filter(e => e.status !== 'cancelled');
      }
      
      // Apply display preferences to remaining events
      const finalEvents = filteredEvents.map(event => {
        const displayEvent = { ...event };
        
        // Hide descriptions if preference is set
        if (!prefs.showEventDescriptions) {
          displayEvent.description = '';
        }
        
        // Hide locations if preference is set
        if (!prefs.showEventLocations) {
          displayEvent.location = '';
        }
        
        // Hide attendee count if preference is set
        if (!prefs.showAttendeeCount) {
          displayEvent.attendees = 0;
        }
        
        // Format time based on user preference
        if (prefs.timeFormat === '24h') {
          // Convert times to 24h format (this would be handled on frontend typically)
          displayEvent.timeFormat = '24h';
        } else {
          displayEvent.timeFormat = '12h';
        }
        
        // Add timezone info
        displayEvent.userTimezone = prefs.timezone || 'UTC';
        
        return displayEvent;
      });
      
      // Group events by type for better organization
      const eventsSummary = {
        total: enhancedEvents.length,
        upcoming: enhancedEvents.filter(e => e.isUpcoming).length,
        ongoing: enhancedEvents.filter(e => e.isOngoing).length,
        past: enhancedEvents.filter(e => e.isPast).length,
        holidays: enhancedEvents.filter(e => e.isHoliday).length,
        allDay: enhancedEvents.filter(e => e.isAllDay).length,
        byCalendar: {
          primary: enhancedEvents.filter(e => e.calendarType === 'primary').length,
          holiday: enhancedEvents.filter(e => e.calendarType === 'holiday').length,
          secondary: enhancedEvents.filter(e => e.calendarType === 'secondary').length
        }
      };
      
      // Prepare filtered summary data
      const filteredSummary = {
        total: finalEvents.length,
        upcoming: finalEvents.filter(e => e.isUpcoming).length,
        ongoing: finalEvents.filter(e => e.isOngoing).length,
        past: finalEvents.filter(e => e.isPast).length,
        holidays: finalEvents.filter(e => e.isHoliday).length,
        allDay: finalEvents.filter(e => e.isAllDay).length,
        byCalendar: {
          primary: finalEvents.filter(e => e.calendarType === 'primary').length,
          holiday: finalEvents.filter(e => e.calendarType === 'holiday').length,
          secondary: finalEvents.filter(e => e.calendarType === 'secondary').length
        },
        // Add info about applied filters
        filters: {
          applied: enhancedEvents.length !== finalEvents.length,
          totalBeforeFilters: enhancedEvents.length,
          totalAfterFilters: finalEvents.length,
          preferences: {
            showHolidays: prefs.showHolidays,
            showSecondaryCalendars: prefs.showSecondaryCalendars,
            showAllDayEvents: prefs.showAllDayEvents,
            showPastEvents: prefs.showPastEvents,
            showOngoingEvents: prefs.showOngoingEvents,
            showUpcomingEvents: prefs.showUpcomingEvents,
            hideDeclinedEvents: prefs.hideDeclinedEvents,
            hideCancelledEvents: prefs.hideCancelledEvents
          }
        }
      };
      
      res.json({
        success: true,
        data: {
          events: finalEvents,
          rawSummary: eventsSummary, // Original summary before filtering
          summary: filteredSummary,   // Summary after filtering
          timeRange: {
            from: timeMin.toISOString(),
            to: timeMax.toISOString(),
            days: parseInt(daysToShow)
          },
          preferences: {
            timeFormat: prefs.timeFormat || '12h',
            timezone: prefs.timezone || 'UTC',
            holidayCountry: prefs.holidayCountry || 'US'
          }
        }
      });
      
    } catch (error) {
      console.error('Calendar events fetch error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch calendar events: ' + error.message
      });
    }
    
  } catch (error) {
    console.error('Get calendar events error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch calendar events'
    });
  }
});

// Get available holiday calendars
app.get('/api/calendar/holiday-calendars', (req, res) => {
  const holidayCalendars = [
    {
      id: 'en.usa#holiday@group.v.calendar.google.com',
      country: 'United States',
      countryCode: 'US',
      language: 'English',
      name: 'US Holidays'
    },
    {
      id: 'en.uk#holiday@group.v.calendar.google.com',
      country: 'United Kingdom',
      countryCode: 'GB',
      language: 'English',
      name: 'UK Holidays'
    },
    {
      id: 'en.canadian#holiday@group.v.calendar.google.com',
      country: 'Canada',
      countryCode: 'CA',
      language: 'English',
      name: 'Canadian Holidays'
    },
    {
      id: 'en.australian#holiday@group.v.calendar.google.com',
      country: 'Australia',
      countryCode: 'AU',
      language: 'English',
      name: 'Australian Holidays'
    },
    {
      id: 'de.german#holiday@group.v.calendar.google.com',
      country: 'Germany',
      countryCode: 'DE',
      language: 'German',
      name: 'German Holidays'
    },
    {
      id: 'fr.french#holiday@group.v.calendar.google.com',
      country: 'France',
      countryCode: 'FR',
      language: 'French',
      name: 'French Holidays'
    },
    {
      id: 'es.spanish#holiday@group.v.calendar.google.com',
      country: 'Spain',
      countryCode: 'ES',
      language: 'Spanish',
      name: 'Spanish Holidays'
    },
    {
      id: 'it.italian#holiday@group.v.calendar.google.com',
      country: 'Italy',
      countryCode: 'IT',
      language: 'Italian',
      name: 'Italian Holidays'
    },
    {
      id: 'ja.japanese#holiday@group.v.calendar.google.com',
      country: 'Japan',
      countryCode: 'JP',
      language: 'Japanese',
      name: 'Japanese Holidays'
    },
    {
      id: 'en.indian#holiday@group.v.calendar.google.com',
      country: 'India',
      countryCode: 'IN',
      language: 'English',
      name: 'Indian Holidays'
    },
    {
      id: 'zh.chinese#holiday@group.v.calendar.google.com',
      country: 'China',
      countryCode: 'CN',
      language: 'Chinese',
      name: 'Chinese Holidays'
    },
    {
      id: 'pt.brazilian#holiday@group.v.calendar.google.com',
      country: 'Brazil',
      countryCode: 'BR',
      language: 'Portuguese',
      name: 'Brazilian Holidays'
    },
    {
      id: 'ru.russian#holiday@group.v.calendar.google.com',
      country: 'Russia',
      countryCode: 'RU',
      language: 'Russian',
      name: 'Russian Holidays'
    },
    {
      id: 'ko.south_korean#holiday@group.v.calendar.google.com',
      country: 'South Korea',
      countryCode: 'KR',
      language: 'Korean',
      name: 'South Korean Holidays'
    },
    {
      id: 'nl.dutch#holiday@group.v.calendar.google.com',
      country: 'Netherlands',
      countryCode: 'NL',
      language: 'Dutch',
      name: 'Dutch Holidays'
    }
  ];
  
  res.json({
    success: true,
    data: {
      calendars: holidayCalendars,
      total: holidayCalendars.length,
      note: 'These are Google\'s public holiday calendars. Availability may vary by region.'
    }
  });
});

// Disconnect calendar
app.delete('/api/calendar/disconnect', authenticateToken, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      $set: {
        'calendar.enabled': false,
        'calendar.accessToken': null,
        'calendar.refreshToken': null,
        'calendar.tokenExpiryDate': null
      }
    });
    
    res.json({
      success: true,
      message: 'Calendar disconnected successfully'
    });
    
  } catch (error) {
    console.error('Disconnect calendar error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to disconnect calendar'
    });
  }
});

// ===============================
// NOTES API ROUTES
// ===============================

// GET /api/notes - Get all notes for the authenticated user
app.get('/api/notes', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const { archived = 'false', search, tags, priority, limit = '50', offset = '0' } = req.query;
    
    // Build query
    const query = { userId };
    
    // Filter by archived status
    query.archived = archived === 'true';
    
    // Filter by priority if specified
    if (priority && ['low', 'medium', 'high', 'urgent'].includes(priority)) {
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
    const limitNum = Math.min(parseInt(limit) || 50, 100); // Max 100 notes per request
    const offsetNum = parseInt(offset) || 0;
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
  } catch (error) {
    console.error('Get notes error:', error);
    res.status(500).json({ success: false, message: 'Failed to get notes' });
  }
});

// GET /api/notes/tags - Get all unique tags for the user
app.get('/api/notes/tags', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    
    const tags = await Note.distinct('tags', { userId, archived: false });
    
    res.json({
      success: true,
      data: tags.filter(tag => tag && tag.trim()).sort()
    });
  } catch (error) {
    console.error('Get tags error:', error);
    res.status(500).json({ success: false, message: 'Failed to get tags' });
  }
});

// GET /api/notes/:id - Get a specific note
app.get('/api/notes/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    
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
  } catch (error) {
    console.error('Get note error:', error);
    res.status(500).json({ success: false, message: 'Failed to get note' });
  }
});

// POST /api/notes - Create a new note
app.post('/api/notes', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
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
    const validColors = ['#ffffff', '#fef3c7', '#d1fae5', '#dbeafe', '#e9d5ff', '#fce7f3', '#fee2e2', '#fed7aa', '#f3f4f6'];
    if (color && !validColors.includes(color)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid note color'
      });
    }
    
    // Validate priority if provided
    if (priority && !['low', 'medium', 'high', 'urgent'].includes(priority)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid note priority'
      });
    }
    
    // Get the next position for the new note
    const maxPosition = await Note.findOne({ userId }, { position: 1 }).sort({ position: -1 });
    const position = maxPosition ? maxPosition.position + 1 : 0;
    
    const noteData = {
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
    
    console.log(`Note created: ${note._id} by user: ${userId}`);
    
    res.status(201).json({
      success: true,
      data: note
    });
  } catch (error) {
    console.error('Create note error:', error);
    res.status(500).json({ success: false, message: 'Failed to create note' });
  }
});

// PUT /api/notes/:id - Update a note
app.put('/api/notes/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
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
      const validColors = ['#ffffff', '#fef3c7', '#d1fae5', '#dbeafe', '#e9d5ff', '#fce7f3', '#fee2e2', '#fed7aa', '#f3f4f6'];
      if (!validColors.includes(color)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid note color'
        });
      }
      note.color = color;
    }
    
    if (priority !== undefined) {
      if (!['low', 'medium', 'high', 'urgent'].includes(priority)) {
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
    
    console.log(`Note updated: ${note._id} by user: ${userId}`);
    
    res.json({
      success: true,
      data: note
    });
  } catch (error) {
    console.error('Update note error:', error);
    res.status(500).json({ success: false, message: 'Failed to update note' });
  }
});

// DELETE /api/notes/:id - Delete a note
app.delete('/api/notes/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    
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
    
    console.log(`Note deleted: ${id} by user: ${userId}`);
    
    res.json({
      success: true,
      message: 'Note deleted successfully'
    });
  } catch (error) {
    console.error('Delete note error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete note' });
  }
});

// POST /api/notes/reorder - Reorder notes
app.post('/api/notes/reorder', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
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
    
    console.log(`Notes reordered: ${noteIds.length} notes by user: ${userId}`);
    
    res.json({
      success: true,
      data: {
        updated: result.modifiedCount
      }
    });
  } catch (error) {
    console.error('Reorder notes error:', error);
    res.status(500).json({ success: false, message: 'Failed to reorder notes' });
  }
});

// POST /api/notes/:id/duplicate - Duplicate a note
app.post('/api/notes/:id/duplicate', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    
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
    
    console.log(`Note duplicated: ${id} -> ${duplicatedNote._id} by user: ${userId}`);
    
    res.status(201).json({
      success: true,
      data: duplicatedNote
    });
  } catch (error) {
    console.error('Duplicate note error:', error);
    res.status(500).json({ success: false, message: 'Failed to duplicate note' });
  }
});

// POST /api/notes/bulk - Bulk operations
app.post('/api/notes/bulk', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
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
        console.log(`Bulk delete: ${result.deletedCount} notes by user: ${userId}`);
        break;
        
      case 'archive':
        result = await Note.updateMany(
          { _id: { $in: noteIds }, userId },
          { archived: true }
        );
        console.log(`Bulk archive: ${result.modifiedCount} notes by user: ${userId}`);
        break;
        
      case 'unarchive':
        result = await Note.updateMany(
          { _id: { $in: noteIds }, userId },
          { archived: false }
        );
        console.log(`Bulk unarchive: ${result.modifiedCount} notes by user: ${userId}`);
        break;
        
      case 'pin':
        result = await Note.updateMany(
          { _id: { $in: noteIds }, userId },
          { pinned: true }
        );
        console.log(`Bulk pin: ${result.modifiedCount} notes by user: ${userId}`);
        break;
        
      case 'unpin':
        result = await Note.updateMany(
          { _id: { $in: noteIds }, userId },
          { pinned: false }
        );
        console.log(`Bulk unpin: ${result.modifiedCount} notes by user: ${userId}`);
        break;
        
      case 'update':
        if (!data || typeof data !== 'object') {
          return res.status(400).json({
            success: false,
            message: 'Data object required for update operation'
          });
        }
        
        // Build update object with only allowed fields
        const updateData = {};
        const validColors = ['#ffffff', '#fef3c7', '#d1fae5', '#dbeafe', '#e9d5ff', '#fce7f3', '#fee2e2', '#fed7aa', '#f3f4f6'];
        if (data.color && validColors.includes(data.color)) {
          updateData.color = data.color;
        }
        if (data.priority && ['low', 'medium', 'high', 'urgent'].includes(data.priority)) {
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
        console.log(`Bulk update: ${result.modifiedCount} notes by user: ${userId}`);
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
  } catch (error) {
    console.error('Bulk operation error:', error);
    res.status(500).json({ success: false, message: 'Failed to perform bulk operation' });
  }
});

// ===============================
// AI API ROUTES
// ===============================

// AI Schema to store user's AI settings
const AISettingsSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  settings: {
    selectedProvider: {
      type: String,
      enum: ['openai', 'gemini', 'claude'],
      default: 'openai'
    },
    providers: {
      openai: {
        apiKey: { type: String, default: null },
        model: { type: String, default: 'gpt-3.5-turbo' },
        enabled: { type: Boolean, default: true }
      },
      gemini: {
        apiKey: { type: String, default: null },
        model: { type: String, default: 'gemini-pro' },
        enabled: { type: Boolean, default: false }
      },
      claude: {
        apiKey: { type: String, default: null },
        model: { type: String, default: 'claude-3-sonnet-20240229' },
        enabled: { type: Boolean, default: false }
      }
    }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const AISettings = mongoose.model('AISettings', AISettingsSchema);

// Helper function to get default AI providers
function getDefaultAIProviders() {
  return {
    providers: [
      {
        id: 'openai',
        name: 'OpenAI',
        models: ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo-preview'],
        description: 'ChatGPT models from OpenAI',
        website: 'https://openai.com',
        enabled: true
      },
      {
        id: 'gemini',
        name: 'Google Gemini',
        models: ['gemini-pro', 'gemini-pro-vision'],
        description: 'Google\'s advanced AI models',
        website: 'https://ai.google.dev',
        enabled: true
      },
      {
        id: 'claude',
        name: 'Anthropic Claude',
        models: ['claude-3-sonnet-20240229', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'],
        description: 'Anthropic\'s Claude AI models',
        website: 'https://anthropic.com',
        enabled: true
      }
    ]
  };
}

// Helper function to get AI client based on provider
function getAIClient(provider, apiKey) {
  switch (provider) {
    case 'openai':
      return new OpenAI({ apiKey });
    case 'gemini':
      return new GoogleGenerativeAI(apiKey);
    case 'claude':
      return new Anthropic({ apiKey });
    default:
      throw new Error(`Unsupported AI provider: ${provider}`);
  }
}

// Helper function to call AI API with unified interface
async function callAI(provider, apiKey, model, prompt) {
  try {
    switch (provider) {
      case 'openai': {
        const openai = new OpenAI({ apiKey });
        const response = await openai.chat.completions.create({
          model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 2000,
          temperature: 0.7
        });
        return response.choices[0].message.content;
      }
      
      case 'gemini': {
        const genAI = new GoogleGenerativeAI(apiKey);
        const geminiModel = genAI.getGenerativeModel({ model });
        const result = await geminiModel.generateContent(prompt);
        const response = await result.response;
        return response.text();
      }
      
      case 'claude': {
        const anthropic = new Anthropic({ apiKey });
        const response = await anthropic.messages.create({
          model,
          max_tokens: 2000,
          messages: [{ role: 'user', content: prompt }]
        });
        return response.content[0].text;
      }
      
      default:
        throw new Error(`Unsupported AI provider: ${provider}`);
    }
  } catch (error) {
    console.error(`AI API call failed for ${provider}:`, error);
    throw error;
  }
}

// Get available AI providers
app.get('/api/user/ai-providers', authenticateToken, async (req, res) => {
  try {
    // Return default providers with fallback
    const defaultProviders = getDefaultAIProviders();
    
    res.json({
      success: true,
      data: defaultProviders
    });
  } catch (error) {
    console.error('Get AI providers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get AI providers'
    });
  }
});

// Get user's AI settings
app.get('/api/user/ai-settings', authenticateToken, async (req, res) => {
  try {
    let aiSettings = await AISettings.findOne({ userId: req.user._id });
    
    if (!aiSettings) {
      // Create default AI settings
      aiSettings = new AISettings({
        userId: req.user._id,
        settings: {
          selectedProvider: 'openai',
          providers: {
            openai: {
              apiKey: null,
              model: 'gpt-3.5-turbo',
              enabled: true
            },
            gemini: {
              apiKey: null,
              model: 'gemini-pro',
              enabled: false
            },
            claude: {
              apiKey: null,
              model: 'claude-3-sonnet-20240229',
              enabled: false
            }
          }
        }
      });
      await aiSettings.save();
    }
    
    // Don't send API keys in response
    const safeSettings = {
      selectedProvider: aiSettings.settings.selectedProvider,
      providers: {
        openai: {
          model: aiSettings.settings.providers.openai.model,
          enabled: aiSettings.settings.providers.openai.enabled,
          hasApiKey: !!aiSettings.settings.providers.openai.apiKey
        },
        gemini: {
          model: aiSettings.settings.providers.gemini.model,
          enabled: aiSettings.settings.providers.gemini.enabled,
          hasApiKey: !!aiSettings.settings.providers.gemini.apiKey
        },
        claude: {
          model: aiSettings.settings.providers.claude.model,
          enabled: aiSettings.settings.providers.claude.enabled,
          hasApiKey: !!aiSettings.settings.providers.claude.apiKey
        }
      }
    };
    
    res.json({
      success: true,
      data: safeSettings
    });
  } catch (error) {
    console.error('Get AI settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get AI settings'
    });
  }
});

// Update user's AI settings
app.put('/api/user/ai-settings', authenticateToken, async (req, res) => {
  try {
    const { selectedProvider, providers } = req.body;
    
    let aiSettings = await AISettings.findOne({ userId: req.user._id });
    
    if (!aiSettings) {
      aiSettings = new AISettings({ userId: req.user._id });
    }
    
    if (selectedProvider) {
      aiSettings.settings.selectedProvider = selectedProvider;
    }
    
    if (providers) {
      // Update each provider settings
      ['openai', 'gemini', 'claude'].forEach(provider => {
        if (providers[provider]) {
          if (!aiSettings.settings.providers[provider]) {
            aiSettings.settings.providers[provider] = {};
          }
          
          if (providers[provider].model) {
            aiSettings.settings.providers[provider].model = providers[provider].model;
          }
          if (typeof providers[provider].enabled === 'boolean') {
            aiSettings.settings.providers[provider].enabled = providers[provider].enabled;
          }
        }
      });
    }
    
    aiSettings.updatedAt = new Date();
    await aiSettings.save();
    
    res.json({
      success: true,
      message: 'AI settings updated successfully'
    });
  } catch (error) {
    console.error('Update AI settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update AI settings'
    });
  }
});

// Set/Update API key for a specific provider
app.post('/api/user/ai-settings/api-key/:provider', authenticateToken, async (req, res) => {
  try {
    const { provider } = req.params;
    const { apiKey } = req.body;
    
    if (!['openai', 'gemini', 'claude'].includes(provider)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid AI provider'
      });
    }
    
    if (!apiKey || typeof apiKey !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'API key is required'
      });
    }
    
    let aiSettings = await AISettings.findOne({ userId: req.user._id });
    
    if (!aiSettings) {
      aiSettings = new AISettings({ userId: req.user._id });
    }
    
    // Ensure provider settings exist
    if (!aiSettings.settings.providers[provider]) {
      aiSettings.settings.providers[provider] = {};
    }
    
    aiSettings.settings.providers[provider].apiKey = apiKey;
    aiSettings.settings.providers[provider].enabled = true;
    aiSettings.updatedAt = new Date();
    
    await aiSettings.save();
    
    res.json({
      success: true,
      message: `${provider.toUpperCase()} API key saved successfully`
    });
  } catch (error) {
    console.error('Set API key error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save API key'
    });
  }
});

// Remove API key for a specific provider
app.delete('/api/user/ai-settings/api-key/:provider', authenticateToken, async (req, res) => {
  try {
    const { provider } = req.params;
    
    if (!['openai', 'gemini', 'claude'].includes(provider)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid AI provider'
      });
    }
    
    const aiSettings = await AISettings.findOne({ userId: req.user._id });
    
    if (aiSettings && aiSettings.settings.providers[provider]) {
      aiSettings.settings.providers[provider].apiKey = null;
      aiSettings.settings.providers[provider].enabled = false;
      aiSettings.updatedAt = new Date();
      await aiSettings.save();
    }
    
    res.json({
      success: true,
      message: `${provider.toUpperCase()} API key removed successfully`
    });
  } catch (error) {
    console.error('Remove API key error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove API key'
    });
  }
});

// AI Note Processing Routes

// NEW ENDPOINT: Process content directly without requiring note ID
app.post('/api/ai/process-content', authenticateToken, async (req, res) => {
  try {
    const { content, aiFunction, instructions } = req.body;
    
    // Validation
    if (!content || typeof content !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Content is required'
      });
    }
    
    const validFunctions = ['summarize', 'create-table', 'enhance', 'extract-actions', 'expand', 'format'];
    if (!aiFunction || !validFunctions.includes(aiFunction)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid AI function. Supported functions: ' + validFunctions.join(', ')
      });
    }
    
    // Get user's AI settings
    const aiSettings = await AISettings.findOne({ userId: req.user._id });
    if (!aiSettings) {
      return res.status(400).json({
        success: false,
        message: 'AI settings not configured'
      });
    }
    
    const selectedProvider = aiSettings.settings.selectedProvider;
    const providerSettings = aiSettings.settings.providers[selectedProvider];
    
    if (!providerSettings || !providerSettings.apiKey || !providerSettings.enabled) {
      return res.status(400).json({
        success: false,
        message: `${selectedProvider.toUpperCase()} is not configured or enabled`
      });
    }
    
    // Create prompt based on AI function
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
    }
    
    const aiResponse = await callAI(selectedProvider, providerSettings.apiKey, providerSettings.model, prompt);
    
    // Handle response based on function
    let result;
    switch (aiFunction) {
      case 'summarize':
        result = {
          summary: aiResponse,
          originalLength: content.length,
          summaryLength: aiResponse.length,
        };
        break;
      case 'create-table':
        result = {
          table: aiResponse,
          format: 'markdown',
        };
        break;
      case 'enhance':
        result = {
          enhancedContent: aiResponse,
        };
        break;
      case 'extract-actions':
        try {
          const actionItems = JSON.parse(aiResponse);
          result = {
            actionItems: Array.isArray(actionItems) ? actionItems : [],
          };
        } catch (parseError) {
          // Fallback for non-JSON responses
          result = {
            actionItems: [
              {
                task: aiResponse,
                priority: 'medium',
                deadline: null,
              },
            ],
          };
        }
        break;
      case 'expand':
        result = {
          expandedContent: aiResponse,
        };
        break;
      case 'format':
        result = {
          formattedContent: aiResponse,
        };
        break;
    }
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error(`AI process-content error (${req.body.aiFunction}):`, error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to process content with AI'
    });
  }
});

// Summarize note content
app.post('/api/ai/notes/:noteId/summarize', authenticateToken, async (req, res) => {
  try {
    const { noteId } = req.params;
    
    // Get the note
    const note = await Note.findOne({ _id: noteId, userId: req.user._id });
    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found'
      });
    }
    
    // Get user's AI settings
    const aiSettings = await AISettings.findOne({ userId: req.user._id });
    if (!aiSettings) {
      return res.status(400).json({
        success: false,
        message: 'AI settings not configured'
      });
    }
    
    const selectedProvider = aiSettings.settings.selectedProvider;
    const providerSettings = aiSettings.settings.providers[selectedProvider];
    
    if (!providerSettings || !providerSettings.apiKey || !providerSettings.enabled) {
      return res.status(400).json({
        success: false,
        message: `${selectedProvider.toUpperCase()} is not configured or enabled`
      });
    }
    
    const prompt = `Please provide a concise summary of the following note content:\n\nTitle: ${note.title}\n\nContent: ${note.content}\n\nProvide a clear, brief summary that captures the main points.`;
    
    const summary = await callAI(selectedProvider, providerSettings.apiKey, providerSettings.model, prompt);
    
    res.json({
      success: true,
      data: {
        summary,
        provider: selectedProvider,
        model: providerSettings.model
      }
    });
  } catch (error) {
    console.error('AI summarize error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to summarize note'
    });
  }
});

// Create table from note content
app.post('/api/ai/notes/:noteId/create-table', authenticateToken, async (req, res) => {
  try {
    const { noteId } = req.params;
    const { tableType = 'general' } = req.body;
    
    // Get the note
    const note = await Note.findOne({ _id: noteId, userId: req.user._id });
    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found'
      });
    }
    
    // Get user's AI settings
    const aiSettings = await AISettings.findOne({ userId: req.user._id });
    if (!aiSettings) {
      return res.status(400).json({
        success: false,
        message: 'AI settings not configured'
      });
    }
    
    const selectedProvider = aiSettings.settings.selectedProvider;
    const providerSettings = aiSettings.settings.providers[selectedProvider];
    
    if (!providerSettings || !providerSettings.apiKey || !providerSettings.enabled) {
      return res.status(400).json({
        success: false,
        message: `${selectedProvider.toUpperCase()} is not configured or enabled`
      });
    }
    
    const prompt = `Please create a well-structured ${tableType} table from the following note content:\n\nTitle: ${note.title}\n\nContent: ${note.content}\n\nFormat the output as a markdown table. Extract relevant information and organize it logically with appropriate headers.`;
    
    const table = await callAI(selectedProvider, providerSettings.apiKey, providerSettings.model, prompt);
    
    res.json({
      success: true,
      data: {
        table,
        tableType,
        provider: selectedProvider,
        model: providerSettings.model
      }
    });
  } catch (error) {
    console.error('AI create table error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create table'
    });
  }
});

// Enhance note content
app.post('/api/ai/notes/:noteId/enhance', authenticateToken, async (req, res) => {
  try {
    const { noteId } = req.params;
    
    // Get the note
    const note = await Note.findOne({ _id: noteId, userId: req.user._id });
    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found'
      });
    }
    
    // Get user's AI settings
    const aiSettings = await AISettings.findOne({ userId: req.user._id });
    if (!aiSettings) {
      return res.status(400).json({
        success: false,
        message: 'AI settings not configured'
      });
    }
    
    const selectedProvider = aiSettings.settings.selectedProvider;
    const providerSettings = aiSettings.settings.providers[selectedProvider];
    
    if (!providerSettings || !providerSettings.apiKey || !providerSettings.enabled) {
      return res.status(400).json({
        success: false,
        message: `${selectedProvider.toUpperCase()} is not configured or enabled`
      });
    }
    
    const prompt = `Please enhance and improve the following note content while maintaining its core meaning and structure:\n\nTitle: ${note.title}\n\nContent: ${note.content}\n\nImprove clarity, add relevant details, fix any grammar issues, and make it more comprehensive and well-organized.`;
    
    const enhancedContent = await callAI(selectedProvider, providerSettings.apiKey, providerSettings.model, prompt);
    
    res.json({
      success: true,
      data: {
        enhancedContent,
        provider: selectedProvider,
        model: providerSettings.model
      }
    });
  } catch (error) {
    console.error('AI enhance error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to enhance content'
    });
  }
});

// Extract action items from note
app.post('/api/ai/notes/:noteId/extract-actions', authenticateToken, async (req, res) => {
  try {
    const { noteId } = req.params;
    
    // Get the note
    const note = await Note.findOne({ _id: noteId, userId: req.user._id });
    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found'
      });
    }
    
    // Get user's AI settings
    const aiSettings = await AISettings.findOne({ userId: req.user._id });
    if (!aiSettings) {
      return res.status(400).json({
        success: false,
        message: 'AI settings not configured'
      });
    }
    
    const selectedProvider = aiSettings.settings.selectedProvider;
    const providerSettings = aiSettings.settings.providers[selectedProvider];
    
    if (!providerSettings || !providerSettings.apiKey || !providerSettings.enabled) {
      return res.status(400).json({
        success: false,
        message: `${selectedProvider.toUpperCase()} is not configured or enabled`
      });
    }
    
    const prompt = `Please extract all action items, tasks, and to-dos from the following note content:\n\nTitle: ${note.title}\n\nContent: ${note.content}\n\nFormat the output as a bulleted list of actionable items. Include priorities if you can determine them from the context.`;
    
    const actionItems = await callAI(selectedProvider, providerSettings.apiKey, providerSettings.model, prompt);
    
    res.json({
      success: true,
      data: {
        actionItems,
        provider: selectedProvider,
        model: providerSettings.model
      }
    });
  } catch (error) {
    console.error('AI extract actions error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to extract action items'
    });
  }
});

// Expand note content
app.post('/api/ai/notes/:noteId/expand', authenticateToken, async (req, res) => {
  try {
    const { noteId } = req.params;
    
    // Get the note
    const note = await Note.findOne({ _id: noteId, userId: req.user._id });
    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found'
      });
    }
    
    // Get user's AI settings
    const aiSettings = await AISettings.findOne({ userId: req.user._id });
    if (!aiSettings) {
      return res.status(400).json({
        success: false,
        message: 'AI settings not configured'
      });
    }
    
    const selectedProvider = aiSettings.settings.selectedProvider;
    const providerSettings = aiSettings.settings.providers[selectedProvider];
    
    if (!providerSettings || !providerSettings.apiKey || !providerSettings.enabled) {
      return res.status(400).json({
        success: false,
        message: `${selectedProvider.toUpperCase()} is not configured or enabled`
      });
    }
    
    const prompt = `Please expand and elaborate on the following note content with additional relevant information, examples, and details:\n\nTitle: ${note.title}\n\nContent: ${note.content}\n\nProvide a more comprehensive version that adds value while maintaining the original structure and intent.`;
    
    const expandedContent = await callAI(selectedProvider, providerSettings.apiKey, providerSettings.model, prompt);
    
    res.json({
      success: true,
      data: {
        expandedContent,
        provider: selectedProvider,
        model: providerSettings.model
      }
    });
  } catch (error) {
    console.error('AI expand error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to expand content'
    });
  }
});

// Format note content
app.post('/api/ai/notes/:noteId/format', authenticateToken, async (req, res) => {
  try {
    const { noteId } = req.params;
    
    // Get the note
    const note = await Note.findOne({ _id: noteId, userId: req.user._id });
    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found'
      });
    }
    
    // Get user's AI settings
    const aiSettings = await AISettings.findOne({ userId: req.user._id });
    if (!aiSettings) {
      return res.status(400).json({
        success: false,
        message: 'AI settings not configured'
      });
    }
    
    const selectedProvider = aiSettings.settings.selectedProvider;
    const providerSettings = aiSettings.settings.providers[selectedProvider];
    
    if (!providerSettings || !providerSettings.apiKey || !providerSettings.enabled) {
      return res.status(400).json({
        success: false,
        message: `${selectedProvider.toUpperCase()} is not configured or enabled`
      });
    }
    
    const prompt = `Please format and improve the structure of the following note content with proper headings, bullet points, and organization:\n\nTitle: ${note.title}\n\nContent: ${note.content}\n\nFormat it with proper markdown formatting, clear sections, and improved readability while preserving all the original information.`;
    
    const formattedContent = await callAI(selectedProvider, providerSettings.apiKey, providerSettings.model, prompt);
    
    res.json({
      success: true,
      data: {
        formattedContent,
        provider: selectedProvider,
        model: providerSettings.model
      }
    });
  } catch (error) {
    console.error('AI format error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to format content'
    });
  }
});

// Custom AI processing
app.post('/api/ai/notes/:noteId/process', authenticateToken, async (req, res) => {
  try {
    const { noteId } = req.params;
    const { instruction } = req.body;
    
    if (!instruction || typeof instruction !== 'string' || !instruction.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Processing instruction is required'
      });
    }
    
    // Get the note
    const note = await Note.findOne({ _id: noteId, userId: req.user._id });
    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found'
      });
    }
    
    // Get user's AI settings
    const aiSettings = await AISettings.findOne({ userId: req.user._id });
    if (!aiSettings) {
      return res.status(400).json({
        success: false,
        message: 'AI settings not configured'
      });
    }
    
    const selectedProvider = aiSettings.settings.selectedProvider;
    const providerSettings = aiSettings.settings.providers[selectedProvider];
    
    if (!providerSettings || !providerSettings.apiKey || !providerSettings.enabled) {
      return res.status(400).json({
        success: false,
        message: `${selectedProvider.toUpperCase()} is not configured or enabled`
      });
    }
    
    const prompt = `${instruction.trim()}\n\nNote Title: ${note.title}\n\nNote Content: ${note.content}`;
    
    const processedContent = await callAI(selectedProvider, providerSettings.apiKey, providerSettings.model, prompt);
    
    res.json({
      success: true,
      data: {
        processedContent,
        instruction: instruction.trim(),
        provider: selectedProvider,
        model: providerSettings.model
      }
    });
  } catch (error) {
    console.error('AI process error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to process with AI'
    });
  }
});

// Helper function to format bytes
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

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
      console.log(`📱 Client URL: ${process.env.CLIENT_URL || 'http://localhost:3000, http://localhost:3001'}`);
      console.log(`☁️  Cloudinary: ${cloudinaryConfigured ? '✅ Ready (25GB FREE)' : '❌ Not configured'}`);
      console.log('📚 API Documentation: See API_DOCUMENTATION.md');
      console.log('');
      console.log('✨ Ready to accept requests with Cloudinary Storage + Notes + Calendar!');
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
