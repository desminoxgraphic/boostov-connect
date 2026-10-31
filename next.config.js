const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let supabaseImagePattern = [];

if (supabaseUrl) {
  try {
    const parsed = new URL(supabaseUrl);
    supabaseImagePattern = [{
      protocol: parsed.protocol.replace(':', ''),
      hostname: parsed.hostname,
      pathname: '/storage/v1/object/public/**',
    }];
  } catch {
    console.warn('NEXT_PUBLIC_SUPABASE_URL is not a valid URL; remote images are disabled.');
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname),
  images: {
    // Card photos are resized for each phone and served as WebP from Vercel's
    // CDN. Stored images change URL when replaced, so a long cache is safe.
    remotePatterns: supabaseImagePattern,
    formats: ['image/webp'],
    minimumCacheTTL: 31536000,
    // Fewer widths = fewer image transformations on the free plan.
    deviceSizes: [640, 828, 1080, 1280],
    imageSizes: [32, 64, 128, 256, 384],
  },
}

module.exports = nextConfig
