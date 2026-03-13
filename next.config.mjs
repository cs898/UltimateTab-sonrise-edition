/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  // Only enable static export during GitHub builds for Mac
  output: process.env.STATIC_EXPORT ? 'export' : undefined,
  images: {
    unoptimized: process.env.STATIC_EXPORT ? true : false,
  },
};

export default nextConfig;
