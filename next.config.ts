import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    // Keep automated upgrades scoped to published security fixes.
    agentUpgrade: 'security',
  },
  turbopack: {
    // Pin the workspace root to this project. Without this, Next/Turbopack can
    // infer the wrong root when a stray lockfile exists in a parent directory
    // (e.g. ~/package-lock.json), which breaks module/CSS resolution.
    root: path.resolve(__dirname),
  },
  trailingSlash: false,
  skipTrailingSlashRedirect: true,
  images: {
    domains: [],
  },
  // Ensure service worker is served correctly without redirects
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
