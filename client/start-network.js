const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting DriveNotes Client on Network...');
console.log('🌐 Client will be accessible at: http://172.20.10.2:3000');
console.log('🔗 Connecting to API at: http://172.20.10.2:5001');
console.log('');

// Start the client
const client = spawn('npm', ['run', 'dev', '--', '--hostname', '0.0.0.0', '--port', '3000'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    NODE_ENV: 'development'
  }
});

// Handle client exit
client.on('close', (code) => {
  console.log(`\n⏹️  Client process exited with code ${code}`);
});

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n⏹️  Shutting down client...');
  client.kill('SIGINT');
});
