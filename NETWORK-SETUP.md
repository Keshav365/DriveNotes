# DriveNotes - Network Setup Guide

## 🌐 Network Configuration

Your DriveNotes application is now configured to run on your local network, allowing access from other devices on the same network.

### 📍 Network Information
- **Your IP Address**: `172.20.10.2`
- **Server Port**: `5001`
- **Client Port**: `3000`

### 🚀 Quick Start

#### Option 1: Start Everything at Once
```bash
# From the root directory
node start-network.js
```

#### Option 2: Start Server and Client Separately
```bash
# Terminal 1 - Start the server
cd server
npm run start:network

# Terminal 2 - Start the client  
cd client
npm run dev:network
```

### 🔗 Access URLs

#### From Your Computer:
- **Client**: http://localhost:3000 or http://172.20.10.2:3000
- **API**: http://localhost:5001 or http://172.20.10.2:5001
- **Health Check**: http://172.20.10.2:5001/api/health

#### From Other Devices on Your Network:
- **Client**: http://172.20.10.2:3000
- **API**: http://172.20.10.2:5001

### 📱 Testing Network Access

1. **Start the application** using one of the methods above
2. **Find your phone/tablet** and connect to the same Wi-Fi network
3. **Open browser** on your device
4. **Navigate to** `http://172.20.10.2:3000`

### 🔧 Configuration Files Updated

The following files have been configured for network access:

- `server/.env` - Updated CLIENT_URL to network IP
- `client/.env.local` - Updated API URLs to network IP  
- `client/next.config.js` - Added network IP to allowed domains
- `server/simple-server.js` - Updated to bind to 0.0.0.0 and allow network CORS

### 🛡️ Security Notes

- This configuration is for **development only**
- The server binds to `0.0.0.0` which accepts connections from all network interfaces
- Make sure you trust all devices on your network
- For production, use proper security configurations

### 🔥 Troubleshooting

#### Can't access from other devices?
1. **Check Windows Firewall** - Ensure ports 3000 and 5001 are allowed
2. **Verify network connection** - All devices must be on the same Wi-Fi network
3. **Check IP address** - Your IP might have changed, run `ipconfig` to verify

#### Server won't start?
1. **Check if ports are in use**: `netstat -ano | findstr :5001`
2. **Kill existing processes**: `taskkill /PID <process_id> /F`

#### CORS errors?
- Make sure the server's CORS configuration includes your client's network IP
- Check that CLIENT_URL in server/.env matches your actual client URL

### 🎯 Next Steps

1. **Test from mobile device** - Open `http://172.20.10.2:3000` in your phone's browser
2. **Share with team members** - They can access using the same URL
3. **Monitor logs** - Watch the terminal for any connection issues

### 📋 Available Scripts

#### Server Scripts:
- `npm run dev:simple` - Local development
- `npm run dev:network` - Network development
- `npm run start:network` - Start on network

#### Client Scripts:
- `npm run dev` - Local development
- `npm run dev:network` - Network development
- `npm run start:network` - Start on network

---

**Happy coding! 🚀**

Your DriveNotes application is now accessible across your entire local network!
