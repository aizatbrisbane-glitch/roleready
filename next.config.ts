import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb"
    }
  },
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  async headers() {
    return [];
  },
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "applyhq.com.au" }],
        destination: "https://www.koalapply.com/:path*",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.applyhq.com.au" }],
        destination: "https://www.koalapply.com/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
