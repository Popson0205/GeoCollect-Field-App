import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  output: "standalone",
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001",
    NEXT_PUBLIC_GEO_API_URL: process.env.NEXT_PUBLIC_GEO_API_URL || "http://localhost:3002",
  },
};
export default nextConfig;
