// next-pwa v5.6.0 - Progressive Web App support
const withPWA = require('next-pwa');
const { runtimeCaching } = require('next-pwa');
const { defaultLanguage, supportedLanguages } = require('./src/config/i18n.config');

/**
 * Enhanced Next.js configuration for Egyptian Map of Pi
 * Implements comprehensive PWA support, Arabic-first i18n,
 * and mobile-optimized performance settings
 */
const nextConfig = {
  // Internationalization configuration prioritizing Arabic
  i18n: {
    locales: ['ar', 'en'],
    defaultLocale: 'ar',
    localeDetection: true,
    domains: [
      {
        domain: 'egyptianmapofpi.com',
        defaultLocale: 'ar',
      },
      {
        domain: 'en.egyptianmapofpi.com',
        defaultLocale: 'en',
      },
    ],
  },

  // Environment variables configuration
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN,
  },

  // Image optimization for responsive design
  images: {
    domains: ['storage.googleapis.com', 'cdn.mapbox.com'],
    deviceSizes: [320, 375, 425, 768, 1024, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    formats: ['image/webp'],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Progressive Web App configuration
  pwa: {
    dest: 'public',
    disable: process.env.NODE_ENV === 'development',
    register: true,
    skipWaiting: true,
    runtimeCaching: [
      {
        urlPattern: '/*',
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'page-cache',
        },
      },
      {
        urlPattern: '/api/*',
        handler: 'NetworkFirst',
        options: {
          cacheName: 'api-cache',
          networkTimeoutSeconds: 10,
        },
      },
      {
        urlPattern: /^https:\/\/storage\.googleapis\.com\/.*/,
        handler: 'CacheFirst',
        options: {
          cacheName: 'image-cache',
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
          },
        },
      },
      {
        urlPattern: /^https:\/\/cdn\.mapbox\.com\/.*/,
        handler: 'CacheFirst',
        options: {
          cacheName: 'mapbox-cache',
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 24 * 60 * 60, // 1 day
          },
        },
      },
    ],
  },

  // React configuration
  reactStrictMode: true,
  swcMinify: true,

  // Production optimization
  compiler: {
    removeConsole: {
      exclude: ['error', 'warn'],
    },
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },

  // Webpack configuration for optimizations
  webpack: (config, { dev, isServer }) => {
    // Enable SWC minification for production
    if (!dev) {
      config.optimization.minimize = true;
    }

    // Add support for importing SVGs as React components
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack'],
    });

    // Optimize bundle size
    if (!isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        minSize: 20000,
        maxSize: 244000,
        minChunks: 1,
        maxAsyncRequests: 30,
        maxInitialRequests: 30,
        cacheGroups: {
          defaultVendors: {
            test: /[\\/]node_modules[\\/]/,
            priority: -10,
            reuseExistingChunk: true,
          },
          default: {
            minChunks: 2,
            priority: -20,
            reuseExistingChunk: true,
          },
        },
      };
    }

    return config;
  },
};

// Export configuration wrapped with PWA enhancement
module.exports = withPWA(nextConfig);