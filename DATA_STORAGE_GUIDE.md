# 🗄️ DriveNotes Data Storage Guide

## 📍 Where Your Data is Stored

### 1. **User Database (MongoDB)**

**Location:** Cloud MongoDB Atlas Database
- **Database:** `drivenotes`
- **Collections:**
  - `users` - User accounts and profiles
  - `folders` - User folders and organization
  - `files` - File metadata (actual files would be in Firebase)

**Connection String:** 
```
mongodb+srv://demo-user:demopassword123@drivenotes.mongodb.net/drivenotes
```

### 2. **Browser Storage (Frontend)**

**Location:** Browser's localStorage
- **Domain:** `localhost:3000`
- **Keys stored:**
  - `accessToken` - JWT authentication token (15 minutes)
  - `refreshToken` - Long-term token (7 days)
  - `user` - User profile information (JSON)

---

## 🔍 How to Inspect Your Data

### **Method 1: Browser DevTools (See Local Storage)**

1. **Open your app** in browser (http://localhost:3000)
2. **Login** to your account
3. **Press F12** to open Developer Tools
4. Go to **Application** tab (or Storage in Firefox)
5. Click **Local Storage** → **http://localhost:3000**
6. You'll see your stored tokens:

```
Key: accessToken
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NTc...

Key: refreshToken  
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NTc...

Key: user
Value: {"id":"657...","email":"test@example.com","firstName":"Test","lastName":"User","isEmailVerified":false,"createdAt":"2024-..."}
```

### **Method 2: MongoDB Compass (See Database)**

1. **Download MongoDB Compass** (free GUI tool)
2. **Connect** using the connection string above
3. **Browse** the `drivenotes` database
4. **View collections:**
   - Click `users` to see all registered users
   - Click `folders` to see user folders
   - Click `files` to see file metadata

### **Method 3: Command Line (Check Backend)**

```powershell
# Test API directly
curl http://localhost:5000/api/health

# Test with your token (replace YOUR_TOKEN)
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:5000/api/user/profile
```

---

## 🔐 Security Details

### **Password Storage**
- **NOT stored in plain text**
- **Hashed with bcrypt** (salt rounds: 12)
- **Example:** 
  ```
  Plain: "password123"
  Stored: "$2b$12$xQZ8R5YXOvO5hPh8QFhLjeLFBVOQ7mHj6QFhLjeLFBVOQ7mHj6QFhLje"
  ```

### **JWT Tokens**
- **Signed with secret keys** (can't be tampered with)
- **Include expiry dates** (auto-expire for security)
- **Contains user ID** (not sensitive data)

### **Browser Storage Security**
- **localStorage** is domain-specific (only your app can access)
- **Cleared on logout** automatically
- **HTTPS recommended** for production

---

## 📊 Data Flow

```
Registration/Login Flow:
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Browser   │    │   Server    │    │  MongoDB    │
│ (Frontend)  │    │ (Backend)   │    │ (Database)  │
└─────────────┘    └─────────────┘    └─────────────┘
        │                  │                  │
        │ POST /register   │                  │
        ├─────────────────►│                  │
        │                  │ Hash password    │
        │                  │ Save user        │
        │                  ├─────────────────►│
        │                  │                  │
        │                  │ Generate JWT     │
        │ Return tokens    │                  │
        │◄─────────────────┤                  │
        │                  │                  │
   Store in localStorage   │                  │
```

---

## 🧹 How to Clear/Reset Data

### **Clear Browser Storage:**
```javascript
// In browser console (F12):
localStorage.clear(); // Clears all local data
// OR specifically:
localStorage.removeItem('accessToken');
localStorage.removeItem('refreshToken');
localStorage.removeItem('user');
```

### **Clear Database (Reset Users):**
1. Use MongoDB Compass
2. Connect to database
3. Drop the `users` collection to remove all accounts
4. Or delete individual user documents

### **Reset Everything:**
```powershell
# 1. Clear browser storage (F12 console):
localStorage.clear();

# 2. Restart server to clear memory
# Press Ctrl+C in server terminal, then:
node simple-server.js
```

---

## 📱 Storage Limits & Lifecycle

### **Browser Storage:**
- **Size limit:** ~5-10MB per domain
- **Persistence:** Until manually cleared or browser data cleared
- **Scope:** Per domain (localhost:3000)

### **Database Storage:**
- **Free MongoDB Atlas:** 512MB
- **Persistence:** Permanent until deleted
- **Scope:** Global (accessible by your backend)

### **Token Lifecycle:**
```
Access Token:  15 minutes → Auto expires
Refresh Token: 7 days → Used to get new access tokens
User Session:  Until logout or refresh token expires
```

---

## 🛠️ Development Tools

### **View Current User:**
Add this to any React component:
```javascript
const { user } = useAuth();
console.log('Current user:', user);
```

### **Check Token Expiry:**
```javascript
// In browser console:
const token = localStorage.getItem('accessToken');
if (token) {
  const payload = JSON.parse(atob(token.split('.')[1]));
  console.log('Token expires:', new Date(payload.exp * 1000));
}
```

### **Monitor API Calls:**
1. Open DevTools (F12)
2. Go to **Network** tab
3. Login/register to see API requests
4. Check request headers for Authorization tokens

---

## 🔒 Production Considerations

When you deploy to production:

1. **Use HTTPS** (required for secure localStorage)
2. **Change MongoDB credentials** (create your own cluster)
3. **Use environment variables** for secrets
4. **Enable MongoDB authentication**
5. **Consider using httpOnly cookies** instead of localStorage
6. **Set up proper CORS** for your domain

Your data is currently stored securely with industry-standard practices! 🛡️
