import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Multi-Zone support: when NEXT_PUBLIC_BASE_PATH is set (e.g. "/hrms"),
  // all routes are served under that prefix. Empty string = standalone mode.
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Frame-Options", value: "SAMEORIGIN" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-XSS-Protection", value: "1; mode=block" },
        {
          key: "Permissions-Policy",
          value: "camera=(), microphone=(), geolocation=()",
        },
      ],
    },
  ],
  images: {
    remotePatterns: [
      { hostname: "*.supabase.co" },
      { hostname: "lh3.googleusercontent.com" },
    ],
  },
};

export default nextConfig;
