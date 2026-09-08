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
    const producao = process.env.NODE_ENV === "production";
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          // Isola esta aba de qualquer janela que a tenha aberto (e vice-versa):
          // uma pagina que abrisse um relatorio com window.open perde a
          // referencia de volta e nao consegue mexer nesta janela.
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          // Plugins antigos (Flash/Acrobat) liam um /crossdomain.xml pra
          // decidir se podiam puxar dados daqui. Nao servimos esse arquivo,
          // mas dizer "nenhuma" explicitamente e de graca.
          { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
          // Reforça o robots.ts no próprio cabeçalho: alguns rastreadores
          // ignoram o /robots.txt, mas respeitam este header — e ele vale
          // também pros arquivos gerados (PPTX/DOCX/RTF), que o robots.txt
          // não alcança individualmente.
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
          // HSTS: depois da primeira visita, o navegador se recusa a falar
          // com este domínio em HTTP puro, mesmo que alguém force o link.
          // Fecha a janela em que a sessão trafegaria em claro numa rede da
          // fábrica ou num Wi-Fi qualquer.
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          // CSP: define de onde a página pode carregar código e mídia. O
          // ganho concreto aqui é sobre o cookie de sessão — mesmo que algum
          // texto de relatório consiga injetar script, ele não tem pra onde
          // mandar o que roubou. 'unsafe-inline'/'unsafe-eval' em script-src
          // continuam porque o runtime do Next e os gráficos do Recharts
          // dependem deles; o resto está fechado.
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://*.public.blob.vercel-storage.com https://picsum.photos",
              "font-src 'self' data:",
              "connect-src 'self' https://*.public.blob.vercel-storage.com",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "object-src 'none'",
              // Manda o navegador refazer em HTTPS qualquer sub-requisicao que
              // apareca em http:// — uma URL de foto antiga gravada no banco,
              // um link colado num relatorio. Junto com o HSTS abaixo, fecha o
              // caminho pra qualquer coisa desta pagina trafegar em claro.
              //
              // So em producao: em http://localhost o navegador tentaria
              // buscar os proprios assets do dev server em https e a pagina
              // nao carregaria.
              ...(producao ? ["upgrade-insecure-requests"] : []),
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
