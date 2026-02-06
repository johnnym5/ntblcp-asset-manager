/** @type {import('next').NextConfig} */
const withPWAInit = require('@ducanh2912/next-pwa').default;

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
});

const nextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [],
  },
};

module.exports = withPWA(nextConfig);
