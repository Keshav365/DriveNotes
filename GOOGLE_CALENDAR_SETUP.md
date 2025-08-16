# 🔧 Fix Google Calendar API Error 403: access_denied

The **Error 403: access_denied** occurs because your Google Cloud Console project needs proper configuration for the Google Calendar API. Follow these steps to fix it:

## 📋 Step-by-Step Fix Guide

### 1. **Enable Google Calendar API**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create a new one if needed)
3. Navigate to **APIs & Services** → **Library**
4. Search for "Google Calendar API"
5. Click on "Google Calendar API" and click **ENABLE**

### 2. **Configure OAuth Consent Screen**

1. Go to **APIs & Services** → **OAuth consent screen**
2. Choose **External** (for testing) or **Internal** (if you have a Google Workspace)
3. Fill out the required fields:
   - **App name**: DriveNotes
   - **User support email**: Your email
   - **Developer contact information**: Your email
4. Click **Save and Continue**

#### **Add Scopes:**
5. Click **ADD OR REMOVE SCOPES**
6. Add these scopes:
   ```
   https://www.googleapis.com/auth/calendar.readonly
   https://www.googleapis.com/auth/calendar.events
   ```
7. Click **Save and Continue**

#### **Add Test Users (for External apps):**
8. Click **ADD USERS**
9. Add your email address and any other emails you want to test with
10. Click **Save and Continue**

### 3. **Update OAuth Credentials**

1. Go to **APIs & Services** → **Credentials**
2. Click on your OAuth 2.0 Client ID
3. In **Authorized redirect URIs**, make sure you have:
   ```
   http://localhost:5001/api/calendar/auth/callback
   ```
4. **Remove any old redirect URIs** that don't match exactly
5. Click **Save**

### 4. **Create API Key (if needed)**

1. In **APIs & Services** → **Credentials**
2. Click **CREATE CREDENTIALS** → **API key**
3. Copy the API key
4. (Optional) Click **RESTRICT KEY** and:
   - Select **HTTP referrers** or **IP addresses** for restriction
   - Under **API restrictions**, select **Google Calendar API**
5. Click **Save**

### 5. **Update Your .env File**

Update your `server/.env` file with:

```env
# Add this line if missing
SERVER_URL=http://localhost:5001

# Replace with your actual API key from step 4
GOOGLE_API_KEY=YOUR_ACTUAL_API_KEY_HERE

# Your existing OAuth credentials should remain:
GOOGLE_CLIENT_ID=956831289984-utoog1j0dpbpl65aotnlfn32eioni0nt.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
```

### 6. **Verify Your Project Quotas**

1. Go to **APIs & Services** → **Quotas**
2. Look for "Google Calendar API"
3. Make sure you have available quota for:
   - **Requests per day**: Should show available quota
   - **Requests per 100 seconds per user**: Should show available quota

## 🚨 Common Issues & Solutions

### **Issue 1: "This app isn't verified"**
- **Cause**: OAuth consent screen not properly configured
- **Solution**: Complete the OAuth consent screen setup above, add test users

### **Issue 2: "redirect_uri_mismatch"** 
- **Cause**: Redirect URI in code doesn't match Google Cloud Console
- **Solution**: Ensure exact match: `http://localhost:5001/api/calendar/auth/callback`

### **Issue 3: "invalid_client"**
- **Cause**: Wrong client ID or secret
- **Solution**: Double-check your `.env` file credentials

### **Issue 4: "insufficient_scope"**
- **Cause**: Missing required scopes
- **Solution**: Add both calendar scopes in OAuth consent screen

## 🔄 After Making Changes

1. **Restart your server**:
   ```bash
   cd server
   npm run dev
   ```

2. **Clear browser cache** or test in incognito mode

3. **Test the OAuth flow** again

## 📝 Expected OAuth Flow

1. User clicks "Connect Calendar" in your app
2. Backend generates auth URL with correct scopes
3. User goes to Google OAuth consent screen
4. User grants permissions
5. Google redirects to: `http://localhost:5001/api/calendar/auth/callback`
6. Backend processes callback and redirects to frontend
7. Frontend shows success message

## 🆘 Still Having Issues?

If you're still getting errors after following these steps:

1. **Check the browser's Network tab** for the exact error response
2. **Verify your project billing** is enabled (required for some APIs)
3. **Try creating a new OAuth client** if the current one is corrupted
4. **Check Google Cloud Console audit logs** for permission issues

---

After completing these steps, your Google Calendar integration should work properly!
