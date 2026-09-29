import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Oswald } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "Relatório Digital de Parada de Máquina",
  description: "Plataforma digital de relatórios de paradas de manutenção industrial",
  // Sem isso, "Adicionar à Tela de Início" no iOS abre em aba de Safari
  // normal (com barra de endereço) em vez de tela cheia como app instalado.
  appleWebApp: {
    capable: true,
    title: "Relatório Digital",
    statusBarStyle: "black-translucent",
  },
};

// viewportFit: "cover" + as variáveis env(safe-area-inset-*) usadas na
// navegação mobile (Sidebar) são o que evita conteúdo entalado atrás do
// notch/home indicator em iPhone quando o site roda instalado em tela cheia.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1b4d99",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${oswald.variable} ${jetbrainsMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">{children}</body>
    </html>
  );
}
