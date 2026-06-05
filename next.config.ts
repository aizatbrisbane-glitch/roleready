import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb"
    }
  },
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core", "pdf-parse"],
};

export default nextConfig;
