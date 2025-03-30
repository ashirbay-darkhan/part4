import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
        pathname: '**',
      },
    ],
    domains: ['localhost'],
    minimumCacheTTL: 60,
    formats: ['image/webp'],
    unoptimized: process.env.NODE_ENV === 'development'
  },
  experimental: {
    optimizeCss: true,
    scrollRestoration: true,
  }
};

export default nextConfig;
