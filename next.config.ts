import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
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
        {
          key: "Content-Security-Policy",
          value:
            "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: *.supabase.co lh3.googleusercontent.com; font-src 'self' data:; connect-src 'self' *.supabase.co *.upstash.io localhost:* 127.0.0.1:*; frame-ancestors 'self'",
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
