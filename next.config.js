/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // better-sqlite3 là native module -> không bundle nó ở phía server components
  experimental: {
    serverComponentsExternalPackages: ["better-sqlite3"]
  }
};

module.exports = nextConfig;
