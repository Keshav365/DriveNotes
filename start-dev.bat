@echo off
echo 🚀 Starting DriveNotes Development Environment
echo.
echo Starting both Frontend (Next.js) and Backend (Cloudinary Server with AI) servers...
echo.
echo 📱 Frontend will be available at: http://localhost:3000
echo 🔧 Backend will be available at: http://localhost:5001
echo ☁️  Storage: Cloudinary (25GB FREE)
echo 🤖 AI Features: Enabled with OpenAI, Gemini, Claude support
echo.
echo Starting backend server...
cd /D server
start /B node cloudinary-server.js
cd /D ..
echo Backend started in background
echo.
echo Starting frontend server...
cd /D client
npm run dev
