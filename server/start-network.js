const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting DriveNotes Server on Network...');
console.log('🌐 Server will be accessible at: http://172.20.10.2:5001');
console.log('🔗 Health Check: http://172.20.10.2:5001/api/health');
console.log('');

// Start the server
const server = spawn('node', ['simple-server.js'], {
  cwd: __dirname,
  stdio: 'inherit',
  env: {
    ...process.env,
    PORT: '5001',
    NODE_ENV: 'development'
  }
});

// Handle server exit
server.on('close', (code) => {
  console.log(`\n⏹️  Server process exited with code ${code}`);
});

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n⏹️  Shutting down server...');
  server.kill('SIGINT');
});
