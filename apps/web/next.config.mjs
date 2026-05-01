/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: '.next-build',
  transpilePackages: ['@monoverse/game-engine', '@monoverse/ui']
};

export default nextConfig;
