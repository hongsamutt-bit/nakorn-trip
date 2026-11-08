import type { NextConfig } from "next";

// Static export so the site can be hosted anywhere (GitHub Pages, Netlify, ...).
// NEXT_PUBLIC_BASE_PATH is set by the GitHub Pages workflow, e.g. "/nakorn-trip".
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || undefined;

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  images: { unoptimized: true },
};

export default nextConfig;
