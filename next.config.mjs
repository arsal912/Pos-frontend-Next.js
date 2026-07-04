import withPWAInit from '@ducanh2912/next-pwa';

/** @type {import('next').NextConfig} */
const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
const backendUrl = rawApiUrl.replace(/\/+$/, '');
const apiDestination = backendUrl.endsWith('/api/v1')
  ? `${backendUrl}/:path*`
  : `${backendUrl}/api/v1/:path*`;

const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'http', hostname: '127.0.0.1' },
      { protocol: 'https', hostname: '**' },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/backend/:path*',
        destination: apiDestination,
      },
    ];
  },
};

const withPWA = withPWAInit({
  dest: 'public',
  // Disable in development to avoid SW interference with HMR
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  reloadOnOnline: true,
  // SW scope covers the entire app
  scope: '/',
  sw: 'sw.js',
  // Runtime caching rules
  runtimeCaching: [
    // App shell — CacheFirst (HTML, JS, CSS, fonts)
    {
      urlPattern: /^https?:\/\/.*\/_next\/static\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'next-static',
        expiration: { maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 }, // 30 days
      },
    },
    // POS sync API GETs — StaleWhileRevalidate with 5-min freshness
    {
      urlPattern: /\/api\/backend\/store\/pos\/sync\/(products|customers|reference|manifest)/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'pos-sync-data',
        expiration: { maxEntries: 20, maxAgeSeconds: 5 * 60 }, // 5 min
      },
    },
    // All other API GETs — NetworkFirst (fresh when online, cache fallback when offline)
    {
      urlPattern: /\/api\/backend\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-responses',
        networkTimeoutSeconds: 5,
        expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 }, // 1 hour
      },
    },
    // Product images — CacheFirst
    {
      urlPattern: /\.(png|jpg|jpeg|svg|gif|webp|avif)$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'images',
        expiration: { maxEntries: 300, maxAgeSeconds: 30 * 24 * 60 * 60 }, // 30 days
      },
    },
  ],
});

export default withPWA(nextConfig);
