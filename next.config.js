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
  output: 'export',
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  // Ensure absolute paths work correctly in the deployed bundle
  trailingSlash: false,
  // Optimized folder scanning for App Router
  images: {
    unoptimized: true
  }
};

module.exports = withPWA(nextConfig);
