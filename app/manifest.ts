import type { MetadataRoute } from "next";

// Convenção nativa do Next (arquivo especial app/manifest.ts) — nenhuma
// biblioteca de PWA precisa entrar no projeto pra isso. Os ícones vêm de
// scripts/gerar-icones-pwa.mjs, derivados do mesmo ícone que já é o favicon
// do site (app/icon.png).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Relatório Digital de Parada de Máquina",
    short_name: "Relatório Digital",
    description: "Documentação, acompanhamento e apresentação de paradas de manutenção industrial — Santher.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#f4f6f9",
    theme_color: "#1b4d99",
    lang: "pt-BR",
    icons: [
      { src: "/pwa/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
