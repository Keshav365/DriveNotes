# Development Guide

## 🚀 Quick Setup

### 1. Install Dependencies
```bash
# Install all dependencies (root, client, server)
npm run setup
```

### 2. Environment Configuration

**Server Environment** (server/.env):
```bash
cp server/.env.example server/.env
```
Edit the file with your actual configuration values.

**Client Environment** (client/.env.local):
```bash
cp client/.env.example client/.env.local
```

### 3. Database Setup

**Option A: Local MongoDB**
```bash
# Using Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Or install MongoDB locally
# https://docs.mongodb.com/manual/installation/
```

**Option B: MongoDB Atlas (Recommended)**
1. Sign up at https://cloud.mongodb.com
2. Create a free cluster
3. Get connection string and add to server/.env

### 4. Google API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable APIs:
   - Google Calendar API
   - Google+ API (for OAuth)
4. Create OAuth 2.0 credentials
5. Add redirect URIs:
   - `http://localhost:3000/auth/google/callback`
6. Get Client ID and Secret, add to both .env files

### 5. OpenAI API Setup

1. Sign up at https://platform.openai.com/
2. Generate API key
3. Add to server/.env as `OPENAI_API_KEY`

### 6. Start Development

```bash
# Start both frontend and backend
npm run dev

# Or start individually
npm run dev:client  # Frontend at http://localhost:3000
npm run dev:server  # Backend at http://localhost:5000
```

## 📁 Project Structure

```
drivenotes-webapp/
├── client/                 # Next.js Frontend
│   ├── src/
│   │   ├── app/           # App Router pages
│   │   ├── components/    # Reusable components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # Utilities
│   │   └── types/         # TypeScript types
│   └── public/            # Static assets
│
├── server/                 # Express.js Backend
│   ├── src/
│   │   ├── controllers/   # Route handlers
│   │   ├── middleware/    # Express middleware
│   │   ├── models/        # Database models
│   │   ├── routes/        # API routes
│   │   ├── services/      # Business logic
│   │   ├── types/         # TypeScript types
│   │   ├── utils/         # Helper functions
│   │   └── config/        # Configuration files
│   └── logs/              # Application logs
│
└── package.json           # Root package.json
```

## 🛠 Development Workflow

### Available Scripts

```bash
# Development
npm run dev              # Start both client and server
npm run dev:client       # Start only frontend
npm run dev:server       # Start only backend

# Building
npm run build           # Build for production
npm run start           # Start production server

# Maintenance
npm run setup           # Install all dependencies
npm run lint            # Run linting
```

### Adding New Features

1. **API Endpoints**: Add to `server/src/routes/`
2. **Database Models**: Add to `server/src/models/`
3. **Frontend Pages**: Add to `client/src/app/`
4. **Components**: Add to `client/src/components/`

### Database Models

Current models:
- **User**: Authentication, preferences, storage
- **File**: File metadata and storage info (TODO)
- **Note**: Note content and metadata (TODO)
- **Reminder**: AI-generated reminders (TODO)

### API Routes

Current routes:
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/google` - Google OAuth
- `GET /api/user/profile` - Get user profile
- `GET /api/files` - File management (TODO)
- `GET /api/notes` - Notes management (TODO)
- `GET /api/ai` - AI features (TODO)
- `GET /api/calendar` - Calendar integration (TODO)

## 🔧 Configuration

### Environment Variables

**Server (.env)**:
```bash
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/drivenotes
JWT_SECRET=your-jwt-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
OPENAI_API_KEY=your-openai-api-key
```

**Client (.env.local)**:
```bash
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
```

### Database Configuration

MongoDB connection with Mongoose:
- Connection pooling enabled
- Auto-reconnection
- Error handling
- Graceful shutdown

### Authentication

JWT-based authentication:
- Access tokens (15 minutes)
- Refresh tokens (7 days)
- Google OAuth integration
- Session management

## 🎨 UI/UX Development

### Design System

- **Colors**: CSS custom properties for theming
- **Components**: Radix UI primitives with Tailwind styling
- **Icons**: Lucide React icons
- **Animations**: Framer Motion
- **Responsive**: Mobile-first design

### Component Structure

```
components/
├── ui/                 # Base UI components
├── forms/              # Form components
├── navigation/         # Navigation components
├── drive/              # Drive-specific components
├── notes/              # Notes-specific components
└── common/             # Shared components
```

## 🧪 Testing

```bash
# Run tests (when implemented)
npm test

# Run specific tests
npm run test:client
npm run test:server
```

## 📦 Building for Production

```bash
# Build client
npm run build

# Start production server
npm run start
```

## 🚀 Deployment

### Frontend (Vercel)
1. Connect repository to Vercel
2. Set environment variables
3. Deploy automatically

### Backend (Railway/Heroku)
1. Create new application
2. Connect repository
3. Set environment variables
4. Deploy

### Database (MongoDB Atlas)
1. Create production cluster
2. Update connection string
3. Set up network access

## 🐛 Debugging

### Common Issues

**MongoDB Connection**:
- Check if MongoDB is running
- Verify connection string
- Check network connectivity

**Google OAuth**:
- Verify client ID and secret
- Check redirect URIs
- Ensure APIs are enabled

**Build Errors**:
- Clear node_modules and reinstall
- Check TypeScript errors
- Verify environment variables

### Logging

Application logs are available in:
- Console (development)
- `server/logs/` directory
- Winston logger for structured logging

## 🔒 Security Considerations

- Environment variables for secrets
- JWT token security
- Input validation
- CORS configuration
- Rate limiting
- Helmet security headers

## 📚 Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Express.js Guide](https://expressjs.com/)
- [MongoDB Atlas](https://docs.atlas.mongodb.com/)
- [Google APIs](https://developers.google.com/calendar)
- [OpenAI API](https://platform.openai.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
