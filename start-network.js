const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting DriveNotes Application on Network...');
console.log('');
console.log('📍 Your Network IP: 172.20.10.2');
console.log('');
console.log('🌐 Server will be accessible at: http://172.20.10.2:5001');
console.log('🌐 Client will be accessible at: http://172.20.10.2:3000');
console.log('');
console.log('🔗 Health Check: http://172.20.10.2:5001/api/health');
console.log('');
console.log('📱 Access from other devices on your network using:');
console.log('   • http://172.20.10.2:3000 (Client)');
console.log('   • http://172.20.10.2:5001 (API)');
console.log('');
console.log('⏰ Starting in 3 seconds...');
console.log('');

setTimeout(() => {
  // Start server
  console.log('🖥️  Starting Server...');
  const server = spawn('node', ['start-network.js'], {
    cwd: path.join(__dirname, 'server'),
    stdio: 'inherit',
    env: {
      ...process.env,
      PORT: '5001'
    }
  });

  // Wait a bit then start client
  setTimeout(() => {
    console.log('');
    console.log('💻 Starting Client...');
    const client = spawn('node', ['start-network.js'], {
      cwd: path.join(__dirname, 'client'),
      stdio: 'inherit',
      shell: true,
      env: {
        ...process.env,
        PORT: '3000'
      }
    });

    // Handle client exit
    client.on('close', (code) => {
      console.log(`\n⏹️  Client process exited with code ${code}`);
      server.kill('SIGINT');
    });

    // Handle Ctrl+C
    process.on('SIGINT', () => {
      console.log('\n⏹️  Shutting down both server and client...');
      client.kill('SIGINT');
      server.kill('SIGINT');
    });

  }, 3000);

  // Handle server exit
  server.on('close', (code) => {
    console.log(`\n⏹️  Server process exited with code ${code}`);
  });

}, 3000);
