/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // nodemailer is a Node-only package (uses crypto/stream/fs). Keep it external
  // so webpack never tries to bundle it (which fails resolving Node built-ins in
  // the instrumentation/edge compilation). It's loaded via require() at runtime
  // in the Node.js server, where the report scheduler & email delivery run.
  serverExternalPackages: ["nodemailer"],
  // The Stitch designs reference remote product/avatar imagery. We render them with
  // plain <img> tags for exact parity, so no next/image domain config is required.
  experimental: {
    serverActions: {
      // Product images are submitted inline as compressed data URLs, so allow
      // form payloads larger than the 1 MB default.
      bodySizeLimit: "6mb",
    },
    // Client-side Router Cache retention. Next 15 defaults `dynamic` to 0, which
    // means every navigation — even returning to a page you just viewed — throws
    // away the cached RSC payload and does a full server round-trip (middleware
    // auth + org lookup + page queries), re-showing the loading skeleton.
    // Retaining dynamic segments for 30s gives framework-native
    // stale-while-revalidate: revisits render instantly from cache and refresh
    // in the background. This is the correct SWR mechanism for a Server
    // Component app (React Query/SWR would require moving all fetching to the
    // client — an anti-pattern here).
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
};

export default nextConfig;
