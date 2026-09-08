import type { MetadataRoute } from "next";

// Este é um sistema interno da fábrica. Os relatórios são abertos por link
// (o QR code da capa), e isso precisa continuar funcionando sem senha — mas
// "aberto por link" não é a mesma coisa que "publicado na internet".
//
// Sem esta regra, é questão de tempo até um relatório com nome de funcionário,
// número de OS e foto de equipamento aparecer numa busca no Google. O robots
// não impede ninguém de abrir o link; ele só evita que o conteúdo seja
// catalogado por quem passa varrendo a web — que é o grosso do tráfego
// automatizado que um site desses recebe.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", disallow: "/" }],
  };
}
