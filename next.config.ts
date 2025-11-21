import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  eslint: {    
    ignoreDuringBuilds: true, // ✅ skip linting on build
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  
  // ✅ OPTIMIZED IMAGE CONFIG
  images: {
    // ❌ DEPRECATED: Remove 'domains'
    // domains: ['localhost', '127.0.0.1', 'api.directcare.com', 'testapi.knowledgemarkg.com'],
    
    // ✅ USE: remotePatterns (Modern approach)
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '', // optional
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
        pathname: '/**', // ✅ Only allow images path
      },
    ],

    // ✅ IMAGE OPTIMIZATION SETTINGS
    formats: ['image/webp', 'image/avif'], // Modern formats for smaller sizes
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840], // Device breakpoints
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384], // Icon sizes
    
    // ✅ CACHING
    minimumCacheTTL: 60, // Cache images for 60 seconds minimum
    
    // ✅ SECURITY
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    
    // ✅ PERFORMANCE (Uncomment in production if API is slow)
    // unoptimized: false, // Set true to disable optimization (faster but larger images)
    
    // ✅ LOADER (Use default or custom)
    // loader: 'default', // or 'custom', 'imgix', 'cloudinary', 'akamai'
  },

  // ✅ DISABLE ROUTER CACHE
  experimental: {
    staleTimes: {
      dynamic: 0,  // No cache for dynamic routes
      static: 0,   // No cache for static routes
    },
  },

  // ✅ COMPRESSION (Enable gzip/brotli)
  compress: true,

  // ✅ PRODUCTION OPTIMIZATIONS
  productionBrowserSourceMaps: false, // Disable source maps in production
  poweredByHeader: false, // Remove X-Powered-By header for security
  
  // ✅ REDIRECTS/REWRITES (Optional)
  async redirects() {
    return [
      // Example: Redirect old product URLs
      // {
      //   source: '/product/:slug',
      //   destination: '/products/:slug',
      //   permanent: true,
      // },
    ];
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
        ],
      },
      {
        // Cache images for 1 year
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
