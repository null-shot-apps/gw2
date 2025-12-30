import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Simple CORS configuration for webview and cross-origin compatibility
  async headers() {
    return [
      {
        // Allow all static assets from any origin
        source: '/(.*)',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, HEAD, OPTIONS, POST, PUT, DELETE, PATCH',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: '*',
          },
          {
            key: 'Access-Control-Expose-Headers',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Credentials',
            value: 'false',
          },
          {
            key: 'Access-Control-Max-Age',
            value: '86400',
          },
          {
            key: 'Content-Security-Policy',
            value: 'frame-ancestors *',
          },
        ],
      },
    ];
  },
  // Allow loading from any domain
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: '**',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    dangerouslyAllowSVG: true,
  },
};

export default nextConfig;

// added by create cloudflare to enable calling `getCloudflareContext()` in `next dev`
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';
initOpenNextCloudflareForDev();
