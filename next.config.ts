import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Add empty turbopack config to silence error (we're using webpack)
  turbopack: {},
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  // Security headers (additional to middleware)
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
        ],
      },
    ];
  },
  // Disable source maps in production for security
  productionBrowserSourceMaps: false,
  // Compress responses
  compress: true,
  // Webpack config to fix file.split error
  webpack: (config, { isServer }) => {
    // Fix for file.split error - ensure file paths are always strings
    const originalEntry = config.entry;
    config.entry = async () => {
      const entries = await originalEntry();
      // Ensure all entry points are properly formatted
      if (entries && typeof entries === 'object') {
        Object.keys(entries).forEach((key) => {
          if (entries[key] && !Array.isArray(entries[key])) {
            entries[key] = [entries[key]].filter(Boolean);
          }
        });
      }
      return entries;
    };
    
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    
    return config;
  },
};

export default nextConfig;
