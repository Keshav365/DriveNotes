# DriveNotes API Documentation

## Base URL
- Development: `http://localhost:5000`
- All API endpoints are prefixed with `/api`

## Authentication
Most endpoints require authentication via JWT tokens in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

---

## 🔐 Authentication Endpoints

### Email Registration
**POST** `/api/auth/register/email`

Register a new user with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully. Please verify your email.",
  "user": {
    "id": "...",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "authMethods": {...},
    "verification": {...}
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Phone Registration
**POST** `/api/auth/register/phone`

Register a new user with phone number and password.

**Request Body:**
```json
{
  "phoneNumber": "+1234567890",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe"
}
```

### Email Login
**POST** `/api/auth/login/email`

Login with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

### Phone Login
**POST** `/api/auth/login/phone`

Login with phone number and password.

**Request Body:**
```json
{
  "phoneNumber": "+1234567890",
  "password": "password123"
}
```

### Email Verification
**POST** `/api/auth/verify/email`

Verify email address with token.

**Request Body:**
```json
{
  "token": "verification-token-here"
}
```

### Phone Verification
**POST** `/api/auth/verify/phone`

Verify phone number with OTP.

**Request Body:**
```json
{
  "phoneNumber": "+1234567890",
  "otp": "123456"
}
```

### Resend OTP
**POST** `/api/auth/resend/otp`

Resend OTP to phone number.

**Request Body:**
```json
{
  "phoneNumber": "+1234567890"
}
```

### Refresh Token
**POST** `/api/auth/refresh`

Get new access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Logout
**POST** `/api/auth/logout`

Logout user (requires authentication).

---

## 👤 User Management Endpoints

### Get User Profile
**GET** `/api/user/profile`

Get current user's profile information.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "preferences": {...},
    "aiSettings": {...},
    "storage": {...}
  }
}
```

### Update Profile
**PUT** `/api/user/profile`

Update user profile information.

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Smith",
  "avatar": "https://example.com/avatar.jpg"
}
```

### Update Preferences
**PUT** `/api/user/preferences`

Update user preferences.

**Request Body:**
```json
{
  "theme": "dark",
  "language": "en",
  "timezone": "UTC",
  "notifications": {
    "email": true,
    "push": true,
    "reminders": true,
    "sms": false
  }
}
```

### Get Available AI Providers
**GET** `/api/user/ai-providers`

Get list of available AI providers.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "openai",
      "name": "OpenAI",
      "models": ["gpt-4", "gpt-3.5-turbo"],
      "description": "Advanced language models from OpenAI"
    }
  ]
}
```

### Update AI Settings
**PUT** `/api/user/ai-settings`

Update AI provider settings.

**Request Body:**
```json
{
  "provider": "openai",
  "preferences": {
    "defaultModel": "gpt-4",
    "maxTokens": 1000,
    "temperature": 0.7
  }
}
```

### Set AI Provider API Key
**POST** `/api/user/ai-settings/api-key`

Add or update API key for AI provider.

**Request Body:**
```json
{
  "provider": "openai",
  "apiKey": "sk-..."
}
```

### Remove AI Provider API Key
**DELETE** `/api/user/ai-settings/api-key/:provider`

Remove API key for specific AI provider.

### Get Storage Usage
**GET** `/api/user/storage`

Get current storage usage information.

### Change Password
**PUT** `/api/user/change-password`

Change user password.

**Request Body:**
```json
{
  "currentPassword": "oldpassword123",
  "newPassword": "newpassword123"
}
```

---

## 📁 File Management Endpoints

### List Files
**GET** `/api/files`

List files with pagination and filters.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `folderId` (optional): Filter by folder ID
- `search` (optional): Search term for files
- `type` (optional): Filter by file type (image, document, video, audio, archive, all)
- `sortBy` (optional): Sort field (name, size, createdAt, lastModified)
- `sortOrder` (optional): Sort order (asc, desc)

**Response:**
```json
{
  "success": true,
  "data": {
    "files": [{
      "id": "...",
      "name": "document.pdf",
      "originalName": "My Document.pdf",
      "size": 1024000,
      "formattedSize": "1.0 MB",
      "contentType": "application/pdf",
      "fileIcon": "document",
      "publicUrl": "https://...",
      "uploadedAt": "2024-01-01T00:00:00Z",
      "uploadedBy": {...}
    }],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "pages": 5
    }
  }
}
```

### Upload Files
**POST** `/api/files/upload`

Upload one or more files.

**Request:** Multipart form data
- `files`: File(s) to upload (max 10 files)
- `folderId` (optional): Target folder ID
- `description` (optional): File description
- `tags` (optional): JSON array of tags

**Response:**
```json
{
  "success": true,
  "message": "3 file(s) uploaded successfully",
  "data": {
    "results": [...],
    "summary": {
      "success": 3,
      "failed": 0,
      "total": 3
    }
  }
}
```

### Get File Details
**GET** `/api/files/:id`

Get detailed information about a specific file.

### Update File Metadata
**PUT** `/api/files/:id`

Update file metadata (name, description, tags).

**Request Body:**
```json
{
  "name": "Updated Name.pdf",
  "description": "Updated description",
  "tags": ["work", "important"]
}
```

### Delete File
**DELETE** `/api/files/:id`

Delete a file permanently.

### Generate Share Link
**POST** `/api/files/:id/share`

Generate a shareable link for a file.

**Request Body:**
```json
{
  "expiresIn": 24,
  "password": "optional-password",
  "allowDownload": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "shareLink": "https://app.com/share/token123",
    "token": "token123",
    "expiresAt": "2024-01-02T00:00:00Z",
    "hasPassword": true,
    "allowDownload": true
  }
}
```

### Download File
**GET** `/api/files/:id/download`

Get download URL for a file.

**Response:**
```json
{
  "success": true,
  "data": {
    "downloadUrl": "https://...",
    "fileName": "document.pdf",
    "size": 1024000,
    "contentType": "application/pdf"
  }
}
```

---

## 📂 Folder Management Endpoints

### List Folders
**GET** `/api/folders`

List folders with pagination and filters.

**Query Parameters:** (same as files endpoint)
- `page`, `limit`, `parentId`, `search`, `sortBy`, `sortOrder`

### Create Folder
**POST** `/api/folders`

Create a new folder.

**Request Body:**
```json
{
  "name": "My Folder",
  "description": "Optional description",
  "parentId": "optional-parent-folder-id",
  "color": "#3B82F6",
  "tags": ["work", "project"]
}
```

### Get Folder Details
**GET** `/api/folders/:id`

Get folder details including contents.

**Response:**
```json
{
  "success": true,
  "data": {
    "folder": {
      "id": "...",
      "name": "My Folder",
      "fileCount": 5,
      "totalSize": 10240000,
      "formattedSize": "10.0 MB"
    },
    "contents": {
      "subfolders": [...],
      "files": [...]
    }
  }
}
```

### Update Folder
**PUT** `/api/folders/:id`

Update folder metadata.

**Request Body:**
```json
{
  "name": "Updated Folder Name",
  "description": "Updated description",
  "color": "#10B981",
  "tags": ["updated", "tags"]
}
```

### Delete Folder
**DELETE** `/api/folders/:id`

Delete a folder.

**Query Parameters:**
- `force` (optional): Set to `true` to delete recursively with contents

### Move Folder
**POST** `/api/folders/:id/move`

Move folder to a different location.

**Request Body:**
```json
{
  "newParentId": "new-parent-folder-id-or-null"
}
```

### Generate Folder Share Link
**POST** `/api/folders/:id/share`

Generate shareable link for a folder.

**Request Body:**
```json
{
  "expiresIn": 24,
  "password": "optional-password",
  "allowUpload": false
}
```

---

## 🔧 System Endpoints

### Health Check
**GET** `/api/health`

Check API health status.

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00Z",
  "uptime": 3600
}
```

---

## 📄 Response Format

All API responses follow this standard format:

### Success Response
```json
{
  "success": true,
  "message": "Optional success message",
  "data": {
    // Response data here
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    // Validation errors array (optional)
  ]
}
```

---

## 🔒 HTTP Status Codes

- `200` - OK (Success)
- `201` - Created (Resource created successfully)
- `400` - Bad Request (Validation errors)
- `401` - Unauthorized (Authentication required)
- `403` - Forbidden (Access denied)
- `404` - Not Found (Resource not found)
- `413` - Payload Too Large (File size limit exceeded)
- `429` - Too Many Requests (Rate limit exceeded)
- `500` - Internal Server Error
- `501` - Not Implemented (Coming soon)

---

## 📝 Notes

### File Upload Limits
- Maximum file size: 100MB (configurable)
- Maximum files per upload: 10
- Supported file types: Configurable via environment variables

### Storage Limits
- Free users: 5GB
- Pro users: Configurable based on subscription

### Rate Limiting
- 100 requests per 15 minutes per IP address
- Higher limits available for authenticated users

### Authentication Tokens
- Access tokens: 15 minutes expiry
- Refresh tokens: 7 days expiry
- Tokens are JWT-based and contain user information

### File Processing
- Files are automatically processed for:
  - Thumbnail generation (images)
  - Text extraction (documents)
  - Metadata extraction
  - AI analysis (if enabled)

---

## 🚀 Coming Soon

The following endpoints are planned for future releases:

- **Notes Management** (`/api/notes/*`)
- **AI Features** (`/api/ai/*`)
- **Google Calendar Integration** (`/api/calendar/*`)
- **Notifications** (`/api/notifications/*`)
- **Real-time Collaboration** (WebSocket)
- **Advanced Search** (`/api/search`)
- **Analytics** (`/api/analytics`)

---

## 🐛 Error Handling

### Common Error Scenarios

1. **Invalid Authentication**
   ```json
   {
     "success": false,
     "message": "Invalid token"
   }
   ```

2. **Storage Limit Exceeded**
   ```json
   {
     "success": false,
     "message": "Storage limit exceeded",
     "required": 1048576,
     "available": 524288
   }
   ```

3. **File Not Found**
   ```json
   {
     "success": false,
     "message": "File not found"
   }
   ```

4. **Validation Errors**
   ```json
   {
     "success": false,
     "message": "Validation failed",
     "errors": [
       {
         "field": "email",
         "message": "Valid email is required"
       }
     ]
   }
   ```

---

## 🛠 Development

### Testing the API

Use tools like Postman, Insomnia, or curl to test the API:

```bash
# Register a new user
curl -X POST http://localhost:5000/api/auth/register/email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "firstName": "Test",
    "lastName": "User"
  }'

# Upload a file
curl -X POST http://localhost:5000/api/files/upload \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -F "files=@/path/to/your/file.pdf" \
  -F "description=Test file upload"
```

### Environment Variables

Make sure to configure the following environment variables:

```bash
# Database
MONGODB_URI=mongodb://localhost:27017/drivenotes

# JWT
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret

# Firebase (for file storage)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_STORAGE_BUCKET=your-bucket-name

# Twilio (for SMS)
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=your-twilio-number

# Encryption
ENCRYPTION_KEY=your-32-character-encryption-key
```

This completes the comprehensive API documentation for all implemented features!
