/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // better-sqlite3 là native module -> không bundle nó ở phía server components
  experimental: {
    serverComponentsExternalPackages: ["better-sqlite3"],
    // dynamic: 0 -> route "động" (như /people/[id], nơi có dùng cookies()) luôn
    // được coi là "cũ ngay lập tức", ép Next.js gọi lại Server Component mỗi lần
    // điều hướng tới, thay vì tái dùng cache cũ trong 30 giây theo mặc định.
    staleTimes: {
      dynamic: 0,
      static: 180
    }
  },
  allowedDevOrigins: ['152.69.216.64', 'localhost']
};

module.exports = nextConfig;
