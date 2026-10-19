/** @type {import('next').NextConfig} */
// Solo el proyecto Supabase propio (hostname exacto de NEXT_PUBLIC_SUPABASE_URL).
const supabaseHost = (() => { try { return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname; } catch { return null; } })();
const nextConfig = {
  images: {
    remotePatterns: supabaseHost
      ? [{ protocol: 'https', hostname: supabaseHost, pathname: '/storage/v1/object/public/**' }]
      : [],
    // sin avif: mitiga GHSA-2xp9-vwfh-vxw4 (RCE con AVIF en el optimizador) mientras se sigue en 14.x
    formats: ['image/webp'],
  },
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
      ],
    }];
  },
};
module.exports = nextConfig;
