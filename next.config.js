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
  images: {
    remotePatterns: supabaseImagePattern,
    unoptimized: true,
  },
}

module.exports = nextConfig
