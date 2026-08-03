/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The Stitch designs reference remote product/avatar imagery. We render them with
  // plain <img> tags for exact parity, so no next/image domain config is required.
  experimental: {
    serverActions: {
      // Product images are submitted inline as compressed data URLs, so allow
      // form payloads larger than the 1 MB default.
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
