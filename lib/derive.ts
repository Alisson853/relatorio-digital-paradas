import type { CaminhoCriticoItem, Equipe, FotoGaleria, GraficosData, Kpis, Servico } from "./types";

const EQUIPES: Equipe[] = ["Elétrica", "Mecânica", "Instrumentação", "Operação", "Segurança", "Civil"];

function parseHoras(tempo: string): number {
  const match = tempo.match(/(\d+)\s*h(?:\s*(\d+)\s*(?:min)?)?/i);
  if (!match) return 0;
  const horas = Number(match[1] ?? 0);
  const minutos = Number(match[2] ?? 0);
  return horas + minutos / 60;
}

export function deriveKpis(servicos: Servico[], seguranca: number): Kpis {
  const osPlanejadas = servicos.length;
  const osConcluidas = servicos.filter((s) => s.status === "concluido").length;
  const eficiencia = osPlanejadas > 0 ? Math.round((osConcluidas / osPlanejadas) * 1000) / 10 : 0;
  const horasTrabalhadas = Math.round(servicos.reduce((sum, s) => sum + parseHoras(s.tempoGasto), 0));
  const equipeEletrica = servicos.filter((s) => s.equipe === "Elétrica").length;
  const equipeMecanica = servicos.filter((s) => s.equipe === "Mecânica").length;

  return {
    osPlanejadas,
    osConcluidas,
    eficiencia,
    horasTrabalhadas,
    equipeEletrica,
    equipeMecanica,
    seguranca,
    pendencias: osPlanejadas - osConcluidas,
  };
}

export function deriveFotos(servicos: Servico[]): FotoGaleria[] {
  const fotos: FotoGaleria[] = [];
  servicos.forEach((s) => {
    fotos.push({ id: `${s.id}-antes`, categoria: "antes", servico: s.equipamento, area: s.area, url: s.fotoAntes });
    fotos.push({ id: `${s.id}-depois`, categoria: "depois", servico: s.equipamento, area: s.area, url: s.fotoDepois });
  });
  return fotos;
}

export function deriveGraficos(
  servicos: Array<Servico & { categoria: string }>,
  caminhoCritico: Array<CaminhoCriticoItem & { causaAtraso: string }>,
  planejadoRealizado: Array<{ etapa: string; planejado: number; realizado: number }>,
  eficiencia: number
): GraficosData {
  const osPorEquipe = EQUIPES.map((equipe) => ({
    equipe,
    quantidade: servicos.filter((s) => s.equipe === equipe).length,
  })).filter((d) => d.quantidade > 0);

  const areaMap = new Map<string, number>();
  servicos.forEach((s) => areaMap.set(s.area, (areaMap.get(s.area) ?? 0) + parseHoras(s.tempoGasto)));
  const horasPorSetor = Array.from(areaMap.entries()).map(([setor, horas]) => ({ setor, horas: Math.round(horas) }));

  const categoriaMap = new Map<string, number>();
  servicos.forEach((s) => categoriaMap.set(s.categoria, (categoriaMap.get(s.categoria) ?? 0) + 1));
  const distribuicaoServicos = Array.from(categoriaMap.entries()).map(([categoria, valor]) => ({ categoria, valor }));

  const causaMap = new Map<string, number>();
  caminhoCritico.forEach((c) => {
    if (c.diferencaMin > 0) {
      const causa = c.causaAtraso.trim() || "Outros";
      causaMap.set(causa, (causaMap.get(causa) ?? 0) + c.diferencaMin / 60);
    }
  });
  let acumulado = 0;
  const paretoAtrasos = Array.from(causaMap.entries())
    .map(([causa, horas]) => ({ causa, horas: Math.round(horas * 10) / 10 }))
    .sort((a, b) => b.horas - a.horas)
    .map((item) => {
      acumulado += item.horas;
      return { ...item, acumulado: Math.round(acumulado * 10) / 10 };
    });

  return {
    osPorEquipe: osPorEquipe.length ? osPorEquipe : [{ equipe: "Sem dados", quantidade: 0 }],
    horasPorSetor: horasPorSetor.length ? horasPorSetor : [{ setor: "Sem dados", horas: 0 }],
    distribuicaoServicos: distribuicaoServicos.length ? distribuicaoServicos : [{ categoria: "Sem dados", valor: 1 }],
    paretoAtrasos: paretoAtrasos.length ? paretoAtrasos : [{ causa: "Sem atrasos", horas: 0, acumulado: 0 }],
    planejadoRealizado,
    percentualConcluido: eficiencia,
  };
}
