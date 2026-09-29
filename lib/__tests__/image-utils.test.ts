import { describe, expect, it } from "vitest";
import { fotoOrigemMuitoGrande, LIMITE_BYTES_FOTO_ORIGEM } from "@/lib/image-utils";

// Bloco F: compressImageFile() em si usa FileReader/<canvas>, que não existem
// no ambiente de teste (node, sem jsdom — ver vitest.config.mts). O teto de
// tamanho foi extraído como função pura exatamente pra poder ser testado sem
// precisar de nenhuma API de navegador, seguindo o mesmo padrão já usado no
// resto do projeto (lib/actions/paradas-logic.ts).
describe("fotoOrigemMuitoGrande", () => {
  it("aceita um arquivo dentro do limite", () => {
    expect(fotoOrigemMuitoGrande(5 * 1024 * 1024)).toBe(false);
  });

  it("aceita um arquivo exatamente no limite", () => {
    expect(fotoOrigemMuitoGrande(LIMITE_BYTES_FOTO_ORIGEM)).toBe(false);
  });

  it("recusa um arquivo acima do limite", () => {
    expect(fotoOrigemMuitoGrande(LIMITE_BYTES_FOTO_ORIGEM + 1)).toBe(true);
  });

  it("recusa um arquivo absurdamente grande", () => {
    expect(fotoOrigemMuitoGrande(500 * 1024 * 1024)).toBe(true);
  });
});
