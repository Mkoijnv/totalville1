/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true, // Adicione esta linha
  },
  typescript: {
    ignoreBuildErrors: true, // Adicione esta linha
  },
  // ... outras configurações
};

export default nextConfig;
