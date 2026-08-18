import type { CaminhoCriticoItem, Equipe, FotoGaleria, GraficosData, Kpis, Servico, StatusItem } from "./types";
import { NO_PHOTO_PLACEHOLDER } from "./image-utils";

export function textoExecutadoPadrao(status: StatusItem): string {
  switch (status) {
    case "concluido":
      return "Serviço executado e concluído conforme necessidade identificada.";
    case "em_andamento":
      return "Serviço em execução, dentro do previsto.";
    case "atrasado":
      return "Serviço iniciado, porém com atraso em relação ao previsto.";
    default:
      return "Serviço ainda não iniciado.";
  }
}

export function textoResultadoPadrao(status: StatusItem): string {
  switch (status) {
    case "concluido":
      return "Equipamento normalizado e liberado para operação.";
    case "em_andamento":
      return "Execução em andamento, resultado a confirmar.";
    case "atrasado":
      return "Conclusão pendente devido ao atraso identificado.";
    default:
      return "Aguardando início da execução.";
  }
}

const EQUIPES: Equipe[] = ["Elétrica", "Mecânica", "Instrumentação", "Operação", "Segurança", "Civil", "Caldeiraria", "Preditiva"];

function parseHoras(tempo: string): number {
  const match = tempo.match(/(\d+)\s*h(?:\s*(\d+)\s*(?:min)?)?/i);
  if (!match) return 0;
  const horas = Number(match[1] ?? 0);
  const minutos = Number(match[2] ?? 0);
  return horas + minutos / 60;
}

export function deriveKpis(servicos: Servico[], seguranca: number, totalPlanejado?: number, totalExecutadas?: number): Kpis {
  // OS Programadas e OS Executadas são números informados à parte — nem toda
  // atividade real vira uma OS detalhada no formulário (só as que têm foto e
  // valem a pena documentar como "principais"). Só cai na contagem de OS com
  // status concluído registradas se nada for informado (relatórios antigos).
  const osConcluidas = totalExecutadas && totalExecutadas > 0 ? totalExecutadas : servicos.filter((s) => s.status === "concluido").length;
  const osPlanejadas = totalPlanejado && totalPlanejado > 0 ? totalPlanejado : servicos.length;
  const eficiencia = osPlanejadas > 0 ? Math.round((osConcluidas / osPlanejadas) * 1000) / 10 : 0;
  const horasTrabalhadas = Math.round(servicos.reduce((sum, s) => sum + parseHoras(s.tempoGasto), 0));
  const equipeEletrica = servicos.filter((s) => s.equipe === "Elétrica").length;
  const equipeMecanica = servicos.filter((s) => s.equipe === "Mecânica").length;
  const equipeInstrumentacao = servicos.filter((s) => s.equipe === "Instrumentação").length;

  return {
    osPlanejadas,
    osConcluidas,
    eficiencia,
    horasTrabalhadas,
    equipeEletrica,
    equipeMecanica,
    equipeInstrumentacao,
    seguranca,
    pendencias: Math.max(0, osPlanejadas - osConcluidas),
  };
}

// Foto de capa automática: quando ninguém envia uma foto dedicada da máquina,
// usamos a primeira foto real (depois > antes > durante) já enviada nos serviços —
// assim o card e a capa nunca ficam com o ícone genérico se já existe alguma foto.
export function deriveFotoCapa(servicos: Servico[]): string | null {
  for (const s of servicos) {
    if (s.fotoDepois && s.fotoDepois !== NO_PHOTO_PLACEHOLDER) return s.fotoDepois;
  }
  for (const s of servicos) {
    if (s.fotoAntes && s.fotoAntes !== NO_PHOTO_PLACEHOLDER) return s.fotoAntes;
  }
  for (const s of servicos) {
    if (s.fotoDurante) return s.fotoDurante;
  }
  return null;
}

export function deriveFotos(servicos: Servico[]): FotoGaleria[] {
  const fotos: FotoGaleria[] = [];
  servicos.forEach((s) => {
    const nome = s.titulo || s.equipamento;
    if (s.fotoAntes && s.fotoAntes !== NO_PHOTO_PLACEHOLDER) {
      fotos.push({ id: `${s.id}-antes`, categoria: "antes", servico: nome, area: s.area, url: s.fotoAntes });
    }
    if (s.fotoDurante) {
      fotos.push({ id: `${s.id}-durante`, categoria: "durante", servico: nome, area: s.area, url: s.fotoDurante });
    }
    if (s.fotoDepois && s.fotoDepois !== NO_PHOTO_PLACEHOLDER) {
      fotos.push({ id: `${s.id}-depois`, categoria: "depois", servico: nome, area: s.area, url: s.fotoDepois });
    }
  });
  return fotos;
}

export function deriveGraficos(
  servicos: Servico[],
  caminhoCritico: CaminhoCriticoItem[],
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
  servicos.forEach((s) => {
    const categoria = s.categoria ?? "Corretiva";
    categoriaMap.set(categoria, (categoriaMap.get(categoria) ?? 0) + 1);
  });
  const distribuicaoServicos = Array.from(categoriaMap.entries()).map(([categoria, valor]) => ({ categoria, valor }));

  const causaMap = new Map<string, number>();
  caminhoCritico.forEach((c) => {
    if (c.diferencaMin > 0) {
      const causa = c.causaAtraso?.trim() || "Outros";
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
