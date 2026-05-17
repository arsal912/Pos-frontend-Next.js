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

export default nextConfig;
