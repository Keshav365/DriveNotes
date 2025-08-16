/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost', '172.20.10.2', 'lh3.googleusercontent.com'],
  },
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    API_URL: process.env.API_URL || 'http://172.20.10.2:5001',
  },
}

module.exports = nextConfig
