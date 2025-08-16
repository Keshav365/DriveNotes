# 📁 File Upload Storage Locations

## 🎯 **Where Files Are Being Uploaded**

### **Physical Storage Location:**
```
📂 C:\Users\ShivamG\Documents\DrivenShit\server\uploads\
```

### **How It Works:**
1. **Files are stored locally** on your server machine
2. **Uploaded files** get unique names to prevent conflicts
3. **Original filenames** are preserved in the database
4. **Files are accessible** via HTTP URLs

---

## 🗂️ **File Storage Structure**

### **Directory Structure:**
```
📁 DrivenShit/
├── 📁 server/
│   ├── 📁 uploads/          ← FILES ARE STORED HERE
│   │   ├── 📄 document-1734245123-456789.pdf
│   │   ├── 🖼️ image-1734245124-987654.jpg
│   │   ├── 📄 report-1734245125-123456.docx
│   │   └── ...more files...
│   ├── 📄 enhanced-server.js
│   └── ...other server files...
├── 📁 client/
└── ...other project files...
```

### **File Naming Convention:**
```
Original: "My Document.pdf"
Stored as: "My Document-1734245123-456789.pdf"

Format: {original-name}-{timestamp}-{random-number}.{extension}
```

---

## 🔍 **How to See Your Uploaded Files**

### **Method 1: File Explorer (Windows)**
1. **Open File Explorer**
2. **Navigate to:** `C:\Users\ShivamG\Documents\DrivenShit\server\uploads\`
3. **View all uploaded files** in this folder

### **Method 2: Command Line**
```powershell
# Navigate to project directory
cd C:\Users\ShivamG\Documents\DrivenShit

# List files in uploads directory
ls server\uploads\

# Or see detailed file info
ls server\uploads\ -l
```

### **Method 3: Browser (Direct Access)**
After uploading files, access them directly:
```
http://localhost:5000/uploads/your-file-name-123456789.pdf
```

### **Method 4: Dashboard UI**
- **Files listed** in "Recent Files" section
- **Click download** to access files
- **File info** shows size, date, etc.

---

## 🎯 **When You Upload Files**

### **What Happens:**
1. **Upload** file through dashboard
2. **File saved** to `server/uploads/` directory
3. **Metadata stored** in MongoDB database
4. **File accessible** via URL: `http://localhost:5000/uploads/filename`

### **Database Storage:**
```javascript
// In MongoDB (file metadata):
{
  name: "document",
  originalName: "My Document.pdf",
  filename: "My Document-1734245123-456789.pdf", // Actual file on disk
  size: 1048576,
  contentType: "application/pdf",
  path: "C:\\Users\\ShivamG\\Documents\\DrivenShit\\server\\uploads\\My Document-1734245123-456789.pdf",
  url: "http://localhost:5000/uploads/My Document-1734245123-456789.pdf",
  owner: "user_id_here",
  uploadedAt: "2024-01-15T12:00:00.000Z"
}
```

---

## 🔧 **Testing File Storage**

### **Upload a Test File:**
1. **Start enhanced server:** `cd server && node enhanced-server.js`
2. **Go to dashboard:** http://localhost:3000/dashboard
3. **Click "Upload Files"**
4. **Upload any file** (image, PDF, document)
5. **Check the uploads folder:** `server/uploads/`

### **Verify File Storage:**
```powershell
# After uploading, check if files are there:
ls server\uploads\

# You should see your uploaded files with unique names
```

### **Access Files Directly:**
```powershell
# If you uploaded "test.pdf", find the actual filename:
ls server\uploads\*test*

# Then access it in browser:
# http://localhost:5000/uploads/test-1234567890-123456789.pdf
```

---

## 📊 **Storage Configuration**

### **Current Settings:**
- **Storage Location:** Local disk (`server/uploads/`)
- **Max File Size:** 100MB per file
- **Max Files:** 10 files per upload
- **Allowed Types:** All file types
- **Public Access:** Yes, via `/uploads/` URL

### **File Serving:**
```javascript
// Server configuration:
const uploadsDir = path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadsDir));
```

---

## 🎯 **Quick Check Commands**

### **See Upload Directory:**
```powershell
cd C:\Users\ShivamG\Documents\DrivenShit\server
ls uploads
```

### **Count Uploaded Files:**
```powershell
(ls server\uploads\).Count
```

### **See File Details:**
```powershell
ls server\uploads\ | Format-Table Name, Length, CreationTime
```

### **Check Server Logs:**
When you start the enhanced server, you'll see:
```
📁 File uploads: C:\Users\ShivamG\Documents\DrivenShit\server\uploads
```

---

## 🛡️ **Security Notes**

### **File Access:**
- **Public URLs:** Files are accessible via `/uploads/` URLs
- **Authentication:** Upload requires login, but access doesn't
- **Unique Names:** Prevents filename conflicts

### **Production Considerations:**
- **Cloud Storage:** Consider AWS S3, Google Cloud, or Firebase
- **CDN:** For faster file delivery
- **Access Control:** Restrict file access based on permissions

---

## 📋 **Summary**

**Your files are uploaded to:**
```
📁 C:\Users\ShivamG\Documents\DrivenShit\server\uploads\
```

**Access them via:**
- **File Explorer:** Navigate to the uploads folder
- **Browser:** http://localhost:5000/uploads/filename
- **Dashboard:** Click download buttons
- **Command Line:** `ls server\uploads\`

**The uploads directory is automatically created** when you start the enhanced server for the first time!

Try uploading a file now and check the `server/uploads/` folder - you'll see your files there! 📁✨
