import { describe, expect, it } from "vitest";
import { filtrarPorMaquinaEPeriodo } from "@/lib/historico-filtro";
import type { ParadaHistoricoItem } from "@/lib/actions/paradas";
import type { ParadaResumo } from "@/lib/types";

function criarItem(overrides: Partial<ParadaResumo> & { id: string }): ParadaHistoricoItem {
  const resumo: ParadaResumo = {
    nome: `Parada ${overrides.id}`,
    maquina: "Máquina de Papel 09",
    area: "Fábrica",
    data: "2026-01-10",
    duracaoPlanejada: "48h",
    duracaoRealizada: "50h",
    status: "em_andamento",
    responsavel: "Fulano",
    imagem: "industrial-press",
    ...overrides,
  };
  return {
    resumo,
    kpis: {
      osPlanejadas: 10,
      osConcluidas: 8,
      eficiencia: 80,
      horasTrabalhadas: 20,
      equipeEletrica: 0,
      equipeMecanica: 0,
      equipeInstrumentacao: 0,
      seguranca: 100,
      pendencias: 2,
      etiquetaVermelha: 0,
      etiquetaAmarela: 0,
    },
    porEquipe: [],
  };
}

describe("filtrarPorMaquinaEPeriodo", () => {
  const itens = [
    criarItem({ id: "a", maquina: "Máquina de Papel 09", data: "2026-01-05" }),
    criarItem({ id: "b", maquina: "Máquina de Papel 11", data: "2026-03-15" }),
    criarItem({ id: "c", maquina: "Máquina de Papel 09", data: "2026-06-20" }),
  ];

  it("sem filtro nenhum, devolve tudo", () => {
    expect(filtrarPorMaquinaEPeriodo(itens, {})).toHaveLength(3);
  });

  it("'todas' equivale a não filtrar por máquina", () => {
    expect(filtrarPorMaquinaEPeriodo(itens, { maquina: "todas" })).toHaveLength(3);
  });

  it("filtra por código de máquina (agrupando por número, não texto exato)", () => {
    const resultado = filtrarPorMaquinaEPeriodo(itens, { maquina: "MP09" });
    expect(resultado.map((i) => i.resumo.id)).toEqual(["a", "c"]);
  });

  it("filtra por período (data >= De)", () => {
    const resultado = filtrarPorMaquinaEPeriodo(itens, { dataDe: "2026-03-01" });
    expect(resultado.map((i) => i.resumo.id)).toEqual(["b", "c"]);
  });

  it("filtra por período (data <= Até)", () => {
    const resultado = filtrarPorMaquinaEPeriodo(itens, { dataAte: "2026-03-15" });
    expect(resultado.map((i) => i.resumo.id)).toEqual(["a", "b"]);
  });

  it("combina máquina e período ao mesmo tempo", () => {
    const resultado = filtrarPorMaquinaEPeriodo(itens, { maquina: "MP09", dataDe: "2026-02-01" });
    expect(resultado.map((i) => i.resumo.id)).toEqual(["c"]);
  });

  it("período inclusivo nas duas pontas", () => {
    const resultado = filtrarPorMaquinaEPeriodo(itens, { dataDe: "2026-01-05", dataAte: "2026-01-05" });
    expect(resultado.map((i) => i.resumo.id)).toEqual(["a"]);
  });
});
