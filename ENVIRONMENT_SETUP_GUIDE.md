# 🔧 DriveNotes Environment Setup Guide

This guide will help you set up all the required environment variables to run your DriveNotes application.

## 🚀 Quick Start (Minimal Setup)

For a basic working app, you only need these services:

### ✅ Already Configured
- **JWT Secrets**: ✅ Generated and set
- **Session Secret**: ✅ Generated and set  
- **Encryption Key**: ✅ Generated and set

### 🔥 Required Services

#### 1. Database - MongoDB (Choose One)

**Option A: MongoDB Atlas (Free - Recommended)**
1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create free account
3. Create a free cluster (M0)
4. Create a database user
5. Get connection string
6. Replace in `server/.env`:
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/drivenotes?retryWrites=true&w=majority
   ```

**Option B: Local MongoDB**
1. Download [MongoDB Community Server](https://www.mongodb.com/try/download/community)
2. Install and start MongoDB
3. Update in `server/.env`:
   ```env
   MONGODB_URI=mongodb://localhost:27017/drivenotes
   ```

#### 2. File Storage - Firebase (Free)
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create new project
3. Enable Storage
4. Go to Project Settings → Service Accounts
5. Generate new private key (downloads JSON file)
6. Update in `server/.env`:
   ```env
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----"
   FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   ```

### 🎯 Try It Now - Basic Setup

With just MongoDB configured, you can run the app:

```powershell
# Test the server only
cd server
npm run dev
```

If successful, you'll see:
```
Server running on port 5000
Connected to MongoDB
```

Then test the frontend:
```powershell
# In another terminal
cd client
npm run dev
```

Visit: http://localhost:3000

---

## 🌟 Full Feature Setup (Optional)

For complete functionality, set up these additional services:

### 3. Authentication - Google OAuth (Optional)
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized origins:
   - `http://localhost:3000`
   - `http://localhost:5000`
6. Update both `.env` files:
   
   **server/.env:**
   ```env
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   ```
   
   **client/.env.local:**
   ```env
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
   ```

### 4. SMS/Phone Auth - Twilio (Optional)
1. Sign up at [Twilio](https://www.twilio.com/)
2. Get free trial credits
3. Get phone number
4. Update `server/.env`:
   ```env
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=your_auth_token
   TWILIO_PHONE_NUMBER=+1234567890
   ```

### 5. Email Notifications - Gmail SMTP (Optional)
1. Enable 2-factor authentication on Gmail
2. Generate app password
3. Update `server/.env`:
   ```env
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   EMAIL_FROM=DriveNotes <your-email@gmail.com>
   ```

### 6. AI Features (Optional - Users can add their own)
Get API keys from:

**OpenAI:**
- Go to [OpenAI API](https://platform.openai.com/api-keys)
- Create API key
- Add to `server/.env`: `OPENAI_API_KEY=sk-...`

**Google Gemini:**
- Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
- Create API key
- Add to `server/.env`: `GEMINI_API_KEY=AIza...`

**Anthropic Claude:**
- Go to [Anthropic Console](https://console.anthropic.com/)
- Create API key
- Add to `server/.env`: `CLAUDE_API_KEY=sk-ant-...`

### 7. Google Calendar Integration (Optional)
1. In Google Cloud Console, enable Calendar API
2. Create API key
3. Update `server/.env`:
   ```env
   GOOGLE_API_KEY=AIzaSyC...
   GOOGLE_CALENDAR_SCOPE=https://www.googleapis.com/auth/calendar
   ```

---

## 🚀 Step-by-Step Quick Setup

### Step 1: Set up MongoDB Atlas (5 minutes)

1. **Sign up**: Go to https://www.mongodb.com/atlas
2. **Create cluster**: Choose "Build a Database" → M0 (Free)
3. **Create user**: Database Access → Add New User
4. **Whitelist IP**: Network Access → Add IP (0.0.0.0/0 for development)
5. **Get connection**: Clusters → Connect → Connect your application
6. **Copy URI**: Replace username:password with your credentials

### Step 2: Set up Firebase Storage (5 minutes)

1. **Create project**: Go to https://console.firebase.google.com/
2. **Enable storage**: Build → Storage → Get Started
3. **Get credentials**: Project Settings → Service Accounts → Generate new private key
4. **Update .env**: Extract values from downloaded JSON

### Step 3: Test the Application

```powershell
# Terminal 1 - Start server
cd server
npm run dev

# Terminal 2 - Start client  
cd client
npm run dev
```

Visit http://localhost:3000 and create an account!

---

## 🐛 Troubleshooting

### Common Issues:

**1. MongoDB Connection Error**
```
Solution: Check MONGODB_URI, ensure cluster is running, verify credentials
```

**2. Firebase Authentication Error**
```
Solution: Verify Firebase credentials in .env, check service account permissions
```

**3. Port Already in Use**
```powershell
# Kill process on port 3000
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

**4. Missing Environment Variables**
```
Solution: Ensure all required .env variables are set without quotes around values
```

---

## 📋 Environment Variables Checklist

### ✅ Required (Minimum to run)
- [ ] `MONGODB_URI` - Database connection
- [ ] `JWT_SECRET` - Authentication (✅ Set)
- [ ] `JWT_REFRESH_SECRET` - Authentication (✅ Set) 
- [ ] `SESSION_SECRET` - Session management (✅ Set)
- [ ] `ENCRYPTION_KEY` - Data encryption (✅ Set)

### 🎯 Recommended (Full functionality)
- [ ] `FIREBASE_PROJECT_ID` - File storage
- [ ] `FIREBASE_CLIENT_EMAIL` - File storage
- [ ] `FIREBASE_PRIVATE_KEY` - File storage  
- [ ] `FIREBASE_STORAGE_BUCKET` - File storage

### 🌟 Optional (Enhanced features)
- [ ] `GOOGLE_CLIENT_ID` - OAuth login
- [ ] `TWILIO_ACCOUNT_SID` - SMS auth
- [ ] `EMAIL_USER` - Email notifications
- [ ] `OPENAI_API_KEY` - AI features

---

## 🎉 What You Can Do Once Running

### With Minimum Setup:
- ✅ User registration/login with email
- ✅ Create/manage folders  
- ✅ Basic file management (limited without Firebase)
- ✅ User profiles and settings

### With Firebase Added:
- ✅ Full file upload/download
- ✅ File sharing with links
- ✅ Image previews and thumbnails
- ✅ All drive functionality

### With Full Setup:
- ✅ Google OAuth login
- ✅ SMS/phone authentication  
- ✅ Email notifications
- ✅ AI-powered features
- ✅ Google Calendar integration

---

## 🔒 Security Notes

- **Never commit .env files** to version control
- **Change default secrets** in production
- **Use HTTPS** in production
- **Enable MongoDB authentication** in production
- **Restrict Firebase security rules** for production

---

## 🆘 Need Help?

1. **Check logs**: Look at server console for error messages
2. **Verify .env**: Ensure no extra spaces or quotes
3. **Test services**: Use provided links to test external services
4. **Start minimal**: Get basic app running first, then add features

Ready to get started? Follow Step 1 above! 🚀
