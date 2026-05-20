import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // NEXT_PUBLIC_* vars are baked at build time by Next.js.
  // They must be set as environment variables in Render BEFORE the build runs.
  // The env block below provides fallbacks for local dev only.
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001",
    NEXT_PUBLIC_GEO_API_URL: process.env.NEXT_PUBLIC_GEO_API_URL || "http://localhost:3002",
    NEXT_PUBLIC_FIELD_URL: process.env.NEXT_PUBLIC_FIELD_URL || "http://localhost:3003",
  },
};

export default nextConfig;
