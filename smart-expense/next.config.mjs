/**
 * Security headers applied to every route.
 *
 * Deliberately conservative — nothing here breaks the app:
 *  - No CSP (would need to allowlist Recharts / framer-motion inline styles)
 *  - No `X-XSS-Protection` (deprecated, browsers ignore or actively harm)
 *  - `frame-ancestors 'none'` via `X-Frame-Options: DENY` prevents clickjacking
 *  - HSTS forces HTTPS on second+ visits (Vercel handles TLS termination)
 */
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains',
  },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false, // don't advertise Next.js version to attackers
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
    },
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
