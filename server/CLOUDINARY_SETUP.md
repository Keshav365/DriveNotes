# 🏆 Cloudinary Setup Guide - 25GB FREE Storage

**Cloudinary is the BEST FREE option** for file storage with 25GB storage + 25GB bandwidth per month!

## 🚀 Quick Setup (5 minutes)

### Step 1: Create Free Account
1. Go to: **https://cloudinary.com/users/register/free**
2. Sign up with your email
3. Verify your email address
4. Complete the onboarding

### Step 2: Get Your Credentials
1. **Go to Dashboard**: https://console.cloudinary.com/
2. You'll see your credentials right on the main page:

```
Cloud name: your-cloud-name
API Key: 123456789012345
API Secret: your-secret-here
```

### Step 3: Update Your .env File
Copy these values to your `server/.env` file:

```env
# Cloudinary Configuration (25GB FREE)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=your-secret-here
```

### Step 4: Start Your Server
```bash
# Use the Cloudinary server
node cloudinary-server.js
```

## ✅ What You Get FREE:

- **25GB Storage** (25x more than Firebase!)
- **25GB Bandwidth/month**
- **Automatic image optimization**
- **Global CDN**
- **Image/video transformations**
- **No credit card required**

## 🔧 Alternative Options:

### Option 1: Supabase (1GB FREE)
- PostgreSQL database included
- Real-time features
- Authentication included

### Option 2: Uploadcare (3GB FREE)
- Image transformations
- CDN worldwide
- Easy API

### Option 3: Backblaze B2 (10GB FREE)
- S3-compatible API
- Good for raw file storage
- 1GB download/day

## 🎯 Why Cloudinary is Best:

1. **Most generous free tier** (25GB vs Firebase's 1GB)
2. **Optimizes images automatically** (faster loading)
3. **Global CDN** (fast worldwide)
4. **Easy to use** (3 credentials only)
5. **No credit card required**

## 📱 Server Features:

✅ **Automatic file upload to Cloudinary**  
✅ **Organized folder structure** (`drivenotes/{userId}/folders/{folderId}`)  
✅ **File deletion** (removes from Cloudinary + database)  
✅ **HTTPS URLs** (secure by default)  
✅ **All file types** (images, videos, documents, etc.)  

## 🔍 Health Check:

Visit: `http://localhost:5000/api/health`

You'll see:
```json
{
  "storage": {
    "provider": "Cloudinary",
    "configured": true,
    "freeTier": "25GB storage + 25GB bandwidth/month"
  }
}
```

## 🚨 Troubleshooting:

**❌ "Cloudinary not configured"**
- Check your `.env` file has the correct credentials
- Make sure there are no extra spaces
- Restart the server

**❌ "Upload failed"**
- Check internet connection
- Verify Cloudinary credentials are correct
- Check file size (100MB limit)

## 📈 Usage Monitoring:

Monitor your usage at: https://console.cloudinary.com/usage

You can see:
- Storage used
- Bandwidth consumed  
- Transformations
- API calls

---

**🎉 That's it! You now have 25GB of FREE cloud storage for your DriveNotes app!**
