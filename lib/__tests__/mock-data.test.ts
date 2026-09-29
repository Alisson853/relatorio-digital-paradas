import { describe, expect, it } from "vitest";
import { gerarResultadoFinal } from "@/lib/mock-data";
import type { GraficosData, Kpis, ParadaResumo } from "@/lib/types";

function criarResumo(overrides: Partial<ParadaResumo> = {}): ParadaResumo {
  return {
    id: "p1",
    nome: "Parada Teste",
    maquina: "MP09",
    area: "Fábrica",
    data: "2026-01-10",
    duracaoPlanejada: "48h",
    duracaoRealizada: "50h",
    status: "em_andamento",
    responsavel: "Fulano",
    imagem: "industrial-press",
    ...overrides,
  };
}

function criarKpis(overrides: Partial<Kpis> = {}): Kpis {
  return {
    osPlanejadas: 0,
    osConcluidas: 0,
    eficiencia: 0,
    horasTrabalhadas: 0,
    equipeEletrica: 0,
    equipeMecanica: 0,
    equipeInstrumentacao: 0,
    seguranca: 100,
    pendencias: 0,
    etiquetaVermelha: 0,
    etiquetaAmarela: 0,
    ...overrides,
  };
}

const GRAFICOS_VAZIOS: GraficosData = {
  osPorEquipe: [],
  horasPorSetor: [],
  horasPorServico: [],
  distribuicaoServicos: [],
  paretoAtrasos: [{ causa: "Sem atrasos", horas: 0, acumulado: 0 }],
  planejadoRealizado: [],
  percentualConcluido: 0,
};

describe("gerarResultadoFinal — resumo executivo baseado em dados reais", () => {
  it("marca resumoAutomatico: true sempre que gera o texto sozinho", () => {
    const resultado = gerarResultadoFinal(criarResumo(), criarKpis());
    expect(resultado.resumoAutomatico).toBe(true);
  });

  it("usa os números reais de OS/eficiência/pendências quando há OS registradas", () => {
    const kpis = criarKpis({ osPlanejadas: 33, osConcluidas: 30, eficiencia: 90.9, pendencias: 3 });
    const resultado = gerarResultadoFinal(criarResumo({ status: "ressalvas" }), kpis);
    expect(resultado.resumo).toContain("33 OS");
    expect(resultado.resumo).toContain("30 concluídas");
    expect(resultado.resumo).toContain("90.9% de eficiência");
    expect(resultado.resumo).toContain("3 pendentes");
  });

  it("usa singular quando há exatamente 1 pendência", () => {
    const kpis = criarKpis({ osPlanejadas: 10, osConcluidas: 9, pendencias: 1 });
    const resultado = gerarResultadoFinal(criarResumo(), kpis);
    expect(resultado.resumo).toContain("1 pendente");
    expect(resultado.resumo).not.toContain("1 pendentes");
  });

  it("não menciona pendências quando não há nenhuma", () => {
    const kpis = criarKpis({ osPlanejadas: 10, osConcluidas: 10, eficiencia: 100, pendencias: 0 });
    const resultado = gerarResultadoFinal(criarResumo(), kpis);
    expect(resultado.resumo).not.toContain("pendente");
  });

  it("não inventa a frase de contagem de OS quando não há nenhuma OS planejada ainda", () => {
    const resultado = gerarResultadoFinal(criarResumo(), criarKpis({ osPlanejadas: 0 }));
    expect(resultado.resumo).not.toContain("OS,");
    expect(resultado.resumo).not.toMatch(/\d+ OS/);
  });

  it("cita a maior causa de atraso só quando o gráfico de Pareto tem uma causa real", () => {
    const graficos: GraficosData = { ...GRAFICOS_VAZIOS, paretoAtrasos: [{ causa: "Falta de peça", horas: 4, acumulado: 4 }] };
    const resultado = gerarResultadoFinal(criarResumo(), criarKpis({ osPlanejadas: 5, osConcluidas: 5 }), graficos);
    expect(resultado.resumo).toContain('"Falta de peça"');
    expect(resultado.resumo).toContain("4h");
  });

  it("não cita causa de atraso quando o Pareto só tem o placeholder 'Sem atrasos'", () => {
    const resultado = gerarResultadoFinal(criarResumo(), criarKpis({ osPlanejadas: 5, osConcluidas: 5 }), GRAFICOS_VAZIOS);
    expect(resultado.resumo).not.toContain("maior atraso");
  });

  it("não quebra quando graficos não é informado", () => {
    const resultado = gerarResultadoFinal(criarResumo(), criarKpis({ osPlanejadas: 5, osConcluidas: 5 }));
    expect(resultado.resumo).not.toContain("maior atraso");
    expect(resultado.resumo.length).toBeGreaterThan(0);
  });

  it("a abertura muda conforme o status geral", () => {
    const concluida = gerarResultadoFinal(criarResumo({ status: "concluida" }), criarKpis());
    const ressalvas = gerarResultadoFinal(criarResumo({ status: "ressalvas" }), criarKpis());
    const andamento = gerarResultadoFinal(criarResumo({ status: "em_andamento" }), criarKpis());
    expect(concluida.resumo).not.toBe(ressalvas.resumo);
    expect(ressalvas.resumo).not.toBe(andamento.resumo);
  });
});
