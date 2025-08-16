# DriveNotes - Modern Drive & Notes Webapp

A comprehensive web application combining cloud storage (like Google Drive) with intelligent note-taking features, AI integration, and Google Calendar synchronization. Built with modern technologies and designed for mobile-first responsive experience.

## 🚀 Features

### 📁 Drive Functionality
- **File Management**: Upload, download, organize files in folders
- **File Sharing**: Share files and folders with granular permissions
- **Version Control**: Track file versions and restore previous versions
- **Search**: Advanced search across all files and folders
- **Preview**: In-browser preview for images, PDFs, and documents
- **Bulk Operations**: Select multiple files for batch operations

### 📝 Smart Notes
- **Rich Text Editor**: Powered by Quill.js with full formatting support
- **AI Integration**: Natural language processing for smart features
- **Auto Reminders**: AI detects and creates calendar reminders from notes
- **Organization**: Tags, categories, and folder-based organization
- **Real-time Collaboration**: Multi-user editing capabilities
- **Templates**: Pre-built note templates for common use cases

### 🤖 AI Features
- **Smart Reminders**: "Set a reminder for this" → Automatically creates Google Calendar event
- **Content Analysis**: Auto-categorize notes and extract key information
- **Smart Suggestions**: AI-powered writing assistance and suggestions
- **Task Detection**: Automatically detect and extract action items
- **Meeting Notes**: AI-enhanced meeting note templates and summaries

### 📅 Calendar Integration
- **Google Calendar Sync**: Seamless integration with Google Calendar
- **Smart Scheduling**: AI-assisted meeting and event scheduling
- **Reminder Management**: Create, edit, and manage reminders from notes
- **Calendar Views**: Integrated calendar views within the app

### 🔔 Notification System
- **Real-time Notifications**: WebSocket-powered instant updates
- **Push Notifications**: Browser push notifications for reminders
- **Email Notifications**: Email alerts for important events
- **Smart Alerts**: AI-determined notification priorities

### 🎨 Modern UI/UX
- **Responsive Design**: Mobile-first, works perfectly on all devices
- **Dark/Light Mode**: System-aware theme switching
- **Modern Components**: Built with Radix UI and Tailwind CSS
- **Smooth Animations**: Framer Motion powered interactions
- **Accessibility**: WCAG compliant with keyboard navigation support

## 🛠 Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Radix UI** - Headless UI components
- **Framer Motion** - Smooth animations
- **React Query** - Data fetching and caching
- **Socket.io Client** - Real-time communication

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **TypeScript** - Type-safe server development
- **MongoDB** - NoSQL database with Mongoose ODM
- **Socket.io** - Real-time WebSocket communication
- **JWT** - Authentication and authorization
- **Passport.js** - OAuth integration

### AI & External APIs
- **OpenAI API** - AI-powered features
- **Google Calendar API** - Calendar integration
- **Google OAuth 2.0** - Authentication
- **Cloudinary** - Image and file storage

### DevOps & Tools
- **Winston** - Logging
- **Helmet** - Security headers
- **Rate Limiting** - API protection
- **Compression** - Response compression
- **CORS** - Cross-origin resource sharing

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- MongoDB (local or MongoDB Atlas)
- Google Cloud Console account (for OAuth and Calendar API)
- OpenAI API key
- Cloudinary account (optional, for file storage)

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd drivenotes-webapp
   ```

2. **Install dependencies**
   ```bash
   npm run setup
   ```

3. **Environment Setup**
   
   **Server (.env)**
   ```bash
   cp server/.env.example server/.env
   ```
   Edit `server/.env` with your configuration:
   - MongoDB connection string
   - JWT secrets
   - Google OAuth credentials
   - OpenAI API key
   - Email configuration

   **Client (.env.local)**
   ```bash
   cp client/.env.example client/.env.local
   ```

4. **Start Development Servers**
   ```bash
   npm run dev
   ```
   
   This starts both frontend (http://localhost:3000) and backend (http://localhost:5000)

### Google Setup

1. **Google Cloud Console**
   - Create a new project or use existing
   - Enable Google Calendar API and Google+ API
   - Create OAuth 2.0 credentials
   - Add authorized redirect URIs:
     - `http://localhost:3000/auth/google/callback` (development)
     - `https://yourdomain.com/auth/google/callback` (production)

2. **Google Calendar API**
   - Enable Google Calendar API in Google Cloud Console
   - Make sure OAuth scope includes calendar access

### Database Setup

**MongoDB Local:**
```bash
# Install MongoDB locally or use Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

**MongoDB Atlas:**
- Create a free cluster at https://cloud.mongodb.com
- Get connection string and add to `.env`

## 📁 Project Structure

```
drivenotes-webapp/
├── client/                     # Next.js frontend
│   ├── src/
│   │   ├── app/               # App router pages
│   │   ├── components/        # Reusable components
│   │   ├── hooks/             # Custom React hooks
│   │   ├── lib/               # Utilities and configurations
│   │   └── types/             # TypeScript type definitions
│   ├── public/                # Static assets
│   └── package.json
│
├── server/                     # Express.js backend
│   ├── src/
│   │   ├── controllers/       # Route handlers
│   │   ├── middleware/        # Express middleware
│   │   ├── models/           # Database models
│   │   ├── routes/           # API routes
│   │   ├── services/         # Business logic
│   │   ├── types/            # TypeScript definitions
│   │   ├── utils/            # Utility functions
│   │   └── server.ts         # Main server file
│   └── package.json
│
├── package.json               # Root package.json
└── README.md
```

## 🔑 Key Features Implementation

### AI-Powered Reminders
When a user writes "Set a reminder for this meeting tomorrow at 2 PM", the AI:
1. Parses the natural language
2. Extracts date, time, and event details
3. Creates a Google Calendar event
4. Confirms with the user

### Real-time Collaboration
- Multiple users can edit notes simultaneously
- Changes are synchronized via WebSocket
- Conflict resolution for concurrent edits
- User presence indicators

### Smart File Organization
- AI-powered auto-categorization
- Duplicate detection and management
- Smart folder suggestions
- Content-based search

## 🔒 Security Features

- JWT-based authentication with refresh tokens
- Rate limiting on all API endpoints
- Input validation and sanitization
- CORS protection
- Helmet security headers
- Password hashing with bcrypt
- File type validation
- XSS protection

## 🎯 Development Workflow

### Available Scripts

```bash
# Development
npm run dev              # Start both client and server
npm run dev:client       # Start only frontend
npm run dev:server       # Start only backend

# Building
npm run build           # Build frontend for production
npm run start           # Start production server

# Utilities
npm run setup           # Install all dependencies
npm run lint            # Run ESLint
npm test               # Run tests
```

### Code Structure Guidelines

- **Components**: Reusable UI components in `client/src/components/`
- **Pages**: App Router pages in `client/src/app/`
- **API Routes**: Express routes in `server/src/routes/`
- **Models**: MongoDB schemas in `server/src/models/`
- **Services**: Business logic in `server/src/services/`

## 🚀 Deployment

### Frontend (Vercel)
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on git push

### Backend (Railway/Heroku)
1. Create new app on Railway or Heroku
2. Connect GitHub repository
3. Set environment variables
4. Deploy

### Database (MongoDB Atlas)
1. Create production cluster
2. Update connection string in environment variables
3. Set up database users and network access

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support, email support@drivenotes.com or create an issue in this repository.

## 🗺 Roadmap

### Phase 1 (Current)
- ✅ Basic authentication
- ✅ File upload/download
- ✅ Note creation/editing
- ✅ AI integration setup

### Phase 2
- [ ] Google Calendar integration
- [ ] Real-time collaboration
- [ ] Advanced search
- [ ] Mobile app development

### Phase 3
- [ ] Advanced AI features
- [ ] Team collaboration
- [ ] Advanced security
- [ ] Performance optimizations

## 🔧 Troubleshooting

### Common Issues

**MongoDB Connection Issues:**
- Ensure MongoDB is running
- Check connection string format
- Verify network connectivity

**Google OAuth Issues:**
- Verify OAuth credentials
- Check redirect URIs
- Ensure APIs are enabled

**File Upload Issues:**
- Check file size limits
- Verify Cloudinary configuration
- Check network connectivity

For more detailed troubleshooting, see our [Wiki](link-to-wiki).
