# 🚀 DriveNotes - Getting Started Guide

## Prerequisites

Before running the application, make sure you have the following installed:

- **Node.js** (v18.0.0 or higher)
- **npm** or **yarn**
- **MongoDB** (local installation or MongoDB Atlas)
- **Git**

## 🛠 Initial Setup

### 1. Install Dependencies

From the root directory, install all dependencies for both client and server:

```powershell
# Install root dependencies and all sub-project dependencies
npm run setup

# OR manually install each part
npm install
cd client && npm install
cd ../server && npm install
cd ..
```

### 2. Environment Configuration

#### Server Environment (.env)
Copy the example environment file and configure it:

```powershell
cd server
copy .env.example .env
```

**Essential Configuration:**
Edit `server/.env` with your settings:

```env
# Database - REQUIRED
MONGODB_URI=mongodb://localhost:27017/drivenotes

# JWT Secrets - REQUIRED (use long, random strings)
JWT_SECRET=your-super-secret-jwt-key-here-make-it-long-and-secure
JWT_REFRESH_SECRET=your-super-secret-refresh-jwt-key-here
SESSION_SECRET=your-session-secret-key-here-also-make-it-secure

# Encryption - REQUIRED (exactly 32 characters)
ENCRYPTION_KEY=your-32-character-encryption-key

# Basic Settings
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:3000
```

#### Client Environment (.env.local)
```powershell
cd ../client
copy .env.example .env.local
```

Edit `client/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

### 3. Database Setup

#### Option A: Local MongoDB
1. Install MongoDB Community Server
2. Start MongoDB service:
   ```powershell
   # Start MongoDB (Windows Service)
   net start MongoDB
   ```

#### Option B: MongoDB Atlas (Cloud)
1. Create account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a cluster
3. Get connection string and update `MONGODB_URI` in `.env`

## 🏃‍♂️ Running the Application

### Development Mode (Recommended)

#### Option 1: Run Both Client and Server Together
```powershell
# From root directory - runs both frontend and backend
npm run dev
```

This will start:
- **Backend API** on `http://localhost:5000`
- **Frontend App** on `http://localhost:3000`

#### Option 2: Run Separately

**Terminal 1 - Backend:**
```powershell
npm run dev:server
# OR
cd server && npm run dev
```

**Terminal 2 - Frontend:**
```powershell
npm run dev:client
# OR
cd client && npm run dev
```

### Production Mode

```powershell
# Build the client
npm run build

# Start the server
npm start
```

## 🌐 Accessing the Application

### Frontend (React/Next.js)
- **URL:** http://localhost:3000
- **Description:** Main user interface

### Backend API
- **URL:** http://localhost:5000
- **Health Check:** http://localhost:5000/api/health
- **API Documentation:** See `API_DOCUMENTATION.md`

## 🔧 Available Features

### 1. Authentication
- **Email Registration/Login:** `http://localhost:3000/auth/login`
- **Phone Registration/Login:** Available via API
- **Google OAuth:** Configure Google credentials in `.env` files

### 2. File Management
- **Upload Files:** Drag & drop or browse to upload
- **Create Folders:** Organize your files
- **Share Files:** Generate shareable links
- **File Preview:** View documents, images, etc.

### 3. Dashboard
- **Storage Overview:** Monitor usage
- **Recent Files:** Quick access
- **Activity Feed:** Track changes

## 📱 Using the Web App

### First Time Setup
1. Open `http://localhost:3000`
2. Click "Sign Up" to create an account
3. Verify your email (if email service configured)
4. Login with your credentials

### Core Workflows

#### File Upload
1. Navigate to Drive section
2. Click "Upload" button or drag files
3. Select files from your computer
4. Add tags/descriptions (optional)
5. Click "Upload"

#### Create Folders
1. In Drive section, click "New Folder"
2. Enter folder name
3. Choose parent folder (optional)
4. Set color/tags (optional)
5. Click "Create"

#### Share Files
1. Right-click on file or click menu (...)
2. Select "Share"
3. Set expiration time
4. Add password (optional)
5. Copy share link

#### Search Files
1. Use search bar at top
2. Filter by file type
3. Sort by date, name, size

## 🔌 API Usage Examples

### Using curl

#### Register a new user:
```powershell
curl -X POST http://localhost:5000/api/auth/register/email `
  -H "Content-Type: application/json" `
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "firstName": "Test",
    "lastName": "User"
  }'
```

#### Upload a file:
```powershell
curl -X POST http://localhost:5000/api/files/upload `
  -H "Authorization: Bearer YOUR_TOKEN_HERE" `
  -F "files=@C:\path\to\your\file.pdf" `
  -F "description=Test file upload"
```

#### Get files list:
```powershell
curl -H "Authorization: Bearer YOUR_TOKEN_HERE" `
  http://localhost:5000/api/files
```

## 🐛 Troubleshooting

### Common Issues

#### 1. MongoDB Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```
**Solution:**
- Ensure MongoDB is running: `net start MongoDB`
- Check MONGODB_URI in `.env`

#### 2. Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::3000
```
**Solution:**
```powershell
# Find and kill process using port 3000
netstat -ano | findstr :3000
taskkill /PID <PID_NUMBER> /F
```

#### 3. JWT Secret Error
```
Error: JWT secret not configured
```
**Solution:**
- Set JWT_SECRET in `server/.env`
- Use a long, random string (32+ characters)

#### 4. File Upload Issues
**Solution:**
- Check MAX_FILE_SIZE in `.env`
- Verify Firebase credentials (if using Firebase storage)
- Check disk space

### Checking Logs

#### Server logs:
```powershell
cd server
npm run dev
# Logs will appear in console
```

#### Client logs:
- Open browser Developer Tools (F12)
- Check Console tab for errors
- Check Network tab for API calls

## 🚀 Next Steps

### Optional Configurations

#### 1. Firebase Storage (for file uploads)
1. Create Firebase project
2. Generate service account key
3. Update Firebase variables in `server/.env`

#### 2. Email Service (for notifications)
1. Configure Gmail SMTP or other provider
2. Update email variables in `server/.env`

#### 3. AI Features
1. Get API keys from:
   - OpenAI (GPT models)
   - Google (Gemini)
   - Anthropic (Claude)
2. Update AI variables in `server/.env`

#### 4. Google Calendar Integration
1. Enable Google Calendar API
2. Configure OAuth credentials
3. Update Google variables in both `.env` files

## 📊 Monitoring

### Health Checks
- Backend: http://localhost:5000/api/health
- Database: Check MongoDB logs
- Storage: Monitor disk usage

### Performance
- Use browser DevTools Performance tab
- Monitor API response times
- Check MongoDB performance

## 🔒 Security Notes

- Change default JWT secrets in production
- Use HTTPS in production
- Configure CORS properly
- Keep dependencies updated
- Use environment variables for secrets
- Enable MongoDB authentication in production

## 📚 Additional Resources

- [API Documentation](./API_DOCUMENTATION.md)
- [Development Guide](./DEVELOPMENT.md)
- [Next.js Documentation](https://nextjs.org/docs)
- [Express.js Documentation](https://expressjs.com/)
- [MongoDB Documentation](https://docs.mongodb.com/)

---

## Quick Start Checklist ✅

- [ ] Install Node.js and MongoDB
- [ ] Clone/download project
- [ ] Run `npm run setup`
- [ ] Copy `.env.example` files and configure
- [ ] Set MongoDB URI and JWT secrets
- [ ] Start MongoDB service
- [ ] Run `npm run dev`
- [ ] Open http://localhost:3000
- [ ] Create account and start using!

**Need help?** Check the troubleshooting section or create an issue in the repository.
