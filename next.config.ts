import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    '192.168.86.84',
    '192.168.86.84:3000',
    '192.168.86.84:3001',
    '192.168.86.123',
    '10.2.0.2',
    '172.25.65.132',
    '172.25.65.132:3000',
    'Marks-MacBook-Air.local',
    'Marks-MacBook-Air.local:3000',
    'localhost',
    'localhost:3000',
    'localhost:3001',
  ],
  async redirects() {
    return [
      {
        source: '/board',
        destination: '/usap/mhmc',
        permanent: false,
      },
      {
        source: '/board/:path*',
        destination: '/:path*',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
