# DriveNotes Development Startup Script
Write-Host "🚀 Starting DriveNotes Development Environment" -ForegroundColor Green
Write-Host ""
Write-Host "Starting both Frontend (Next.js) and Backend (Cloudinary) servers..." -ForegroundColor Yellow
Write-Host ""
Write-Host "📱 Frontend will be available at: http://localhost:3000" -ForegroundColor Cyan
Write-Host "🔧 Backend will be available at: http://localhost:5000" -ForegroundColor Cyan
Write-Host "☁️  Storage: Cloudinary (25GB FREE)" -ForegroundColor Blue
Write-Host ""

# Run the development command
npm run dev
