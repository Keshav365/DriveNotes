const crypto = require('crypto');

// Generate secure random strings
function generateSecret(length = 64) {
    return crypto.randomBytes(length).toString('hex');
}

function generateEncryptionKey() {
    return crypto.randomBytes(16).toString('hex'); // 32 characters
}

console.log('=== DriveNotes Environment Variables ===\n');

console.log('# JWT Configuration');
console.log(`JWT_SECRET=${generateSecret()}`);
console.log(`JWT_REFRESH_SECRET=${generateSecret()}`);
console.log('');

console.log('# Session Configuration');
console.log(`SESSION_SECRET=${generateSecret()}`);
console.log('');

console.log('# Encryption');
console.log(`ENCRYPTION_KEY=${generateEncryptionKey()}`);
console.log('');

console.log('Copy these values to your server/.env file!');
