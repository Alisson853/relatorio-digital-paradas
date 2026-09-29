import { describe, expect, it } from "vitest";
import { coletarResponsaveisConhecidos } from "@/lib/actions/paradas-logic";
import { criarServico } from "./fixtures";

describe("coletarResponsaveisConhecidos", () => {
  it("junta nomes do responsável da parada e dos serviços, sem repetir", () => {
    const rows = [
      { responsavel: "João Silva", servicos: [criarServico({ responsavel: "Carlos Souza" }), criarServico({ responsavel: "João Silva" })] },
      { responsavel: "Marcos Oliveira", servicos: [criarServico({ responsavel: "Carlos Souza" })] },
    ];

    const nomes = coletarResponsaveisConhecidos(rows);

    expect(nomes).toEqual(["Carlos Souza", "João Silva", "Marcos Oliveira"]); // ordem alfabética pt-BR
  });

  it("descarta valores que não parecem nome de pessoa (lixo de planilha, número de turno)", () => {
    const rows = [{ responsavel: "3", servicos: [criarServico({ responsavel: "????" }), criarServico({ responsavel: "" })] }];
    expect(coletarResponsaveisConhecidos(rows)).toEqual([]);
  });

  it("nunca inventa nome nenhum: lista vazia quando não há nenhum relatório", () => {
    expect(coletarResponsaveisConhecidos([])).toEqual([]);
  });
});
