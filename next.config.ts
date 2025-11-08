import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  eslint: {    
     ignoreDuringBuilds: true, // ✅ skip linting on build
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    domains: [
      'localhost',              // for local development
      '127.0.0.1',              // optional local IP
      'api.directcare.com',     // 🔹 replace this with your actual API domain
      'testapi.knowledgemarkg.com',
    ],
  },
  
};

export default nextConfig;
