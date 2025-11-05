import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    domains: [
      'localhost',              // for local development
      '127.0.0.1',              // optional local IP
      'api.directcare.com',     // 🔹 replace this with your actual API domain
    ],
  },
};

export default nextConfig;
