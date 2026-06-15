/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Pin the workspace root — this repo lives inside a larger workspace that has
  // its own lockfiles, which would otherwise confuse Next's root inference.
  outputFileTracingRoot: __dirname,
};

module.exports = nextConfig;
