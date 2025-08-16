# DriveNotes Deployment Guide

## Overview
This guide will help you deploy your DriveNotes application with:
- **Backend**: Railway (free tier)
- **Frontend**: Vercel (free tier)

## Prerequisites
- Git repository (GitHub, GitLab, or Bitbucket)
- Railway account
- Vercel account

## Step 1: Prepare Your Repository

1. **Commit all your changes:**
   ```bash
   git add .
   git commit -m "Prepare for deployment"
   git push origin main
   ```

## Step 2: Deploy Backend to Railway

1. **Sign up for Railway:**
   - Go to [railway.app](https://railway.app)
   - Sign up with GitHub (recommended)

2. **Create a new project:**
   - Click "Deploy from GitHub repo"
   - Select your repository
   - Choose the `server` folder as the root directory

3. **Configure environment variables:**
   Copy these from your `server/.env` file to Railway:
   ```
   NODE_ENV=production
   PORT=5001
   MONGODB_URI=your-mongodb-connection-string
   JWT_SECRET=your-jwt-secret
   JWT_REFRESH_SECRET=your-refresh-secret
   SESSION_SECRET=your-session-secret
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
   CLOUDINARY_API_KEY=your-cloudinary-api-key
   CLOUDINARY_API_SECRET=your-cloudinary-api-secret
   CLIENT_URL=https://your-vercel-app.vercel.app
   # Add all other environment variables from your .env file
   ```

4. **Set up MongoDB:**
   - Option 1: Use Railway's MongoDB plugin
   - Option 2: Use MongoDB Atlas (recommended)
   - Update MONGODB_URI with your production database URL

5. **Deploy:**
   - Railway will automatically build and deploy your backend
   - Note your Railway app URL (e.g., `https://your-app.railway.app`)

## Step 3: Deploy Frontend to Vercel

1. **Sign up for Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Sign up with GitHub

2. **Import your project:**
   - Click "New Project"
   - Import from Git repository
   - Select your repository
   - Set root directory to `client`

3. **Configure environment variables:**
   ```
   NEXT_PUBLIC_API_URL=https://your-railway-app.railway.app
   NEXT_PUBLIC_SOCKET_URL=https://your-railway-app.railway.app
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
   NEXTAUTH_URL=https://your-vercel-app.vercel.app
   NEXTAUTH_SECRET=your-nextauth-secret
   ```

4. **Deploy:**
   - Vercel will automatically build and deploy your frontend
   - Your app will be available at your Vercel URL

## Step 4: Update CORS Configuration

After deployment, update your backend CORS settings with your production URLs:

1. In your server code, update CORS origins:
   ```javascript
   app.use(cors({
     origin: [
       'https://your-vercel-app.vercel.app',
       'http://localhost:3000' // Keep for local development
     ],
     credentials: true
   }));
   ```

2. Redeploy your backend to Railway

## Step 5: Test Your Deployment

1. Visit your Vercel URL
2. Test user registration/login
3. Test file upload/download
4. Verify all features work correctly

## Troubleshooting

### Common Issues:

1. **CORS errors**: Make sure your backend CORS settings include your frontend URL
2. **Environment variables**: Double-check all environment variables are set correctly
3. **Database connection**: Ensure your MongoDB URI is correct and accessible
4. **Build failures**: Check the build logs for specific errors

### Monitoring:
- Railway provides logs and metrics for your backend
- Vercel provides analytics and performance insights
- Both platforms offer error tracking

## Free Tier Limitations

### Railway:
- $5 credit per month (pay-as-you-go after)
- Applications sleep after 30 minutes of inactivity

### Vercel:
- 100GB bandwidth per month
- 1000 serverless function invocations per day
- 45 minutes build time per month

## Next Steps

After successful deployment:
1. Set up custom domains (optional)
2. Configure monitoring and alerts
3. Set up CI/CD for automatic deployments
4. Consider upgrading to paid tiers for production use

## Support

If you encounter issues:
- Check Railway docs: https://docs.railway.app
- Check Vercel docs: https://vercel.com/docs
- Review application logs on both platforms
