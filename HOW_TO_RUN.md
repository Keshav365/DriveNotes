# 🚀 How to Run DriveNotes Project

Your DriveNotes project is ready to run with **Cloudinary** for 25GB FREE cloud storage!

## 🎯 Quick Start (Easiest Way)

### Option 1: Use the Batch File (Windows)
```bash
# Double-click the file or run in terminal
./start-dev.bat
```

### Option 2: Use PowerShell Script
```powershell
# Run in PowerShell
./start-dev.ps1
```

### Option 3: Use NPM Commands
```bash
# From the root directory (C:\Users\ShivamG\Documents\DrivenShit)
npm run dev
```

This will start **BOTH** servers simultaneously:
- 📱 **Frontend (Next.js)**: http://localhost:3000  
- 🔧 **Backend (Node.js + Cloudinary)**: http://localhost:5000

## 📁 Project Structure

```
DrivenShit/
├── client/          # Next.js frontend
├── server/          # Node.js backend
├── package.json     # Root scripts
├── start-dev.bat    # Windows batch script
└── start-dev.ps1    # PowerShell script
```

## 🔧 Manual Setup (If needed)

### 1. Install Dependencies (One-time setup)
```bash
# Install all dependencies for both frontend and backend
npm run setup
```

### 2. Start Individual Components

#### Frontend Only
```bash
cd client
npm run dev
# Available at: http://localhost:3000
```

#### Backend Only (Cloudinary)
```bash
cd server
npm run dev:cloudinary
# Available at: http://localhost:5000
```

## ✅ Available Scripts

From the **root directory**:

| Command | Description |
|---------|-------------|
| `npm run dev` | 🚀 Start both frontend & backend |
| `npm run dev:client` | 📱 Start frontend only |
| `npm run dev:server:cloudinary` | 🔧 Start Cloudinary backend only |
| `npm run build` | 🏗️ Build for production |
| `npm run start` | ⚡ Start production server |
| `npm run setup` | 📦 Install all dependencies |

## 🔍 Health Checks

### Backend Health Check
Visit: http://localhost:5000/api/health

You should see:
```json
{
  "status": "OK",
  "storage": {
    "provider": "Cloudinary",
    "configured": true,
    "freeTier": "25GB storage + 25GB bandwidth/month"
  }
}
```

### Frontend Check
Visit: http://localhost:3000

You should see the DriveNotes login/dashboard page.

## 🚨 Troubleshooting

### Port Already in Use
If you get "EADDRINUSE" error:

```bash
# Kill process on port 5000
netstat -ano | findstr :5000
taskkill /PID <PID_NUMBER> /F

# Or use different port
$env:PORT=5001; npm run dev
```

### Cloudinary Not Working
Check your `.env` file in the `server/` directory:

```env
CLOUDINARY_CLOUD_NAME=dcgh9vkrh
CLOUDINARY_API_KEY=551977271533634
CLOUDINARY_API_SECRET=4bv8VodXrjQzjecoVzK5D4ta8P0
```

### Dependencies Missing
```bash
# Reinstall everything
npm run setup
```

## 📱 Testing File Upload

1. **Start the servers**: `npm run dev`
2. **Open**: http://localhost:3000
3. **Login/Register** with any email
4. **Go to Dashboard**
5. **Upload files** - they'll go to Cloudinary automatically!

## 🎉 What You Get

✅ **Frontend**: Modern Next.js React app  
✅ **Backend**: Node.js API server  
✅ **Database**: MongoDB (cloud)  
✅ **Storage**: Cloudinary (25GB FREE)  
✅ **Authentication**: JWT-based  
✅ **File Upload**: Drag & drop with cloud storage  

## 📊 Monitoring Usage

- **Cloudinary Dashboard**: https://console.cloudinary.com/usage
- **MongoDB Atlas**: https://cloud.mongodb.com/

---

**🎯 Just run `npm run dev` and you're ready to go!**
