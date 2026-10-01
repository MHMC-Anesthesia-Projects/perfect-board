import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    '192.168.86.84',
    '192.168.86.84:3000',
    '192.168.86.84:3001',
    '192.168.86.123',
    '10.2.0.2',
    'localhost',
    'localhost:3000',
    'localhost:3001',
  ],
};

export default nextConfig;
