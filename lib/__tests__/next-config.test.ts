import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";

// Bloco H: `images.unoptimized: true` é o que desliga a rota /_next/image —
// e com ela, a vulnerabilidade crítica de RCE não autenticado do Next.js
// 16.3.0 na própria API de Otimização de Imagem (GHSA-2xp9-vwfh-vxw4). Este
// teste existe só pra travar contra alguém remover essa flag sem perceber
// (ex: ao mexer em next.config.ts pra outra coisa) enquanto o projeto ainda
// estiver numa versão vulnerável do Next.
describe("next.config.ts — mitigação da RCE do Image Optimizer", () => {
  it("mantém images.unoptimized ligado", () => {
    expect(nextConfig.images?.unoptimized).toBe(true);
  });
});
