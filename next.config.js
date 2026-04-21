/** @type {import('next').NextConfig} */
const withPWAInit = require('@ducanh2912/next-pwa').default;

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  reloadOnOnline: true,
  sw: 'sw.js'
});

const nextConfig = {
  reactStrictMode: true,
  // Removing output: 'export' to support dynamic features and Firebase App Hosting SSR.
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  images: {
    unoptimized: true
  }
};

module.exports = withPWA(nextConfig);
