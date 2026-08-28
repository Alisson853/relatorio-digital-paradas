import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Não anuncia "X-Powered-By: Next.js" pra quem inspecionar as respostas.
  poweredByHeader: false,
  // Fotos comprimidas da Captura Rápida (1600px, qualidade 0.8) costumam passar
  // do limite padrão de 1MB de Server Actions, derrubando o envio mesmo com bom sinal.
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  // sharp é um módulo nativo — empacotar ele no bundle da rota (em vez de deixar
  // como dependência externa resolvida em runtime) quebra silenciosamente o
  // export de RTF com fotos.
  serverExternalPackages: ["sharp"],
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
  // Cabeçalhos básicos de segurança (checklist padrão de qualquer revisão de
  // TI): impedem a página de ser carregada dentro de um iframe de outro site
  // (clickjacking), impedem o navegador de "adivinhar" o tipo de um arquivo
  // servido, evitam vazar a URL completa como referrer em links externos, e
  // desligam câmera/microfone/geolocalização via API do navegador — a Captura
  // Rápida usa o input nativo de arquivo (abre o app de câmera do celular),
  // não getUserMedia, então não precisa dessa permissão.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
