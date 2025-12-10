/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  // Disable problematic source maps that cause file.split errors in Next.js 15
  productionBrowserSourceMaps: false,
  // Simplified webpack config to fix file.split error
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

module.exports = nextConfig;

