import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    '192.168.86.123',
    '10.2.0.2',
    'localhost',
  ],
};

export default nextConfig;
