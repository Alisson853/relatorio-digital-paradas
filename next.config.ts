import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fotos comprimidas da Captura Rápida (1600px, qualidade 0.8) costumam passar
  // do limite padrão de 1MB de Server Actions, derrubando o envio mesmo com bom sinal.
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
};

export default nextConfig;
