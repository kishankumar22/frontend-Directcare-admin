import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV === 'development';

const nextConfig: NextConfig = {
  // ✅ Strict Mode: OFF in dev (prevents double calls), ON in production
  reactStrictMode: !isDev,  // false in dev, true in production
  
  eslint: {    
    ignoreDuringBuilds: true,
  },
  
  typescript: {
    ignoreBuildErrors: false,
  },
  
  // ✅ OPTIMIZED IMAGE CONFIG
images: {
  remotePatterns: [
    {
      protocol: 'http',
      hostname: 'localhost',
      pathname: '/**',
    },
    {
      protocol: 'http',
      hostname: '127.0.0.1',
      pathname: '/**',
    },
    {
      protocol: 'https',
      hostname: 'api.directcare.com',
      pathname: '/**',
    },
    {
      protocol: 'https',
      hostname: 'testapi.knowledgemarkg.com',
      pathname: '/**',
    },
    {
      protocol: 'https',
      hostname: 'directcare.knowledgemarkg.com',
      pathname: '/**',
    },
    {
      protocol: 'https',
      hostname: 'example.com',   // 👈 ADD THIS
      pathname: '/**',
    },
  ],
}
,

  // ✅ COMPRESSION
  compress: true,

  // ✅ PRODUCTION OPTIMIZATIONS
  productionBrowserSourceMaps: false,
  poweredByHeader: false,
  
  // ✅ REDIRECTS
  async redirects() {
    return [];
  },

  // ✅ HEADERS (Security & Performance)
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate',
          },
        ],
      },
      {
        // Cache static images for 1 year
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
