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

export function parseHoras(tempo: string): number {
  const comH = tempo.match(/(\d+)\s*h(?:\s*(\d+)\s*(?:min)?)?/i);
  if (comH) {
    const horas = Number(comH[1] ?? 0);
    const minutos = Number(comH[2] ?? 0);
    return horas + minutos / 60;
  }
  // Alguns relatórios salvam a duração como número puro ("13" em vez de "13h").
  const soNumero = tempo.match(/^\s*(\d+(?:[.,]\d+)?)\s*$/);
  if (soNumero) return Number(soNumero[1].replace(",", "."));
  return 0;
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

// Só os serviços "principais" — os que já têm ao menos uma foto real — entram
// na apresentação/exports. Serviços importados de planilha sem foto ainda
// contam para os KPIs e para o checklist de pendências, mas não viram slide.
export function temFotoReal(servico: Servico): boolean {
  const antes = !!servico.fotoAntes && servico.fotoAntes !== NO_PHOTO_PLACEHOLDER;
  const durante = !!servico.fotoDurante;
  const depois = !!servico.fotoDepois && servico.fotoDepois !== NO_PHOTO_PLACEHOLDER;
  return antes || durante || depois;
}

export function servicosComFoto(servicos: Servico[]): Servico[] {
  return servicos.filter(temFotoReal);
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
  eficiencia: number,
  duracaoMaximaHoras?: number
): GraficosData {
  const osPorEquipe = EQUIPES.map((equipe) => ({
    equipe,
    quantidade: servicos.filter((s) => s.equipe === equipe).length,
  })).filter((d) => d.quantidade > 0);

  // O tempo de cada OS é individual e várias rodam em paralelo (times
  // diferentes, ou mais de uma pessoa na mesma equipe) — então somar o tempo
  // de todas as OS de um setor sem limite estoura a duração real da parada.
  // Sem dados de horário por pessoa, o teto mais honesto é a duração da
  // própria parada: nenhum setor trabalhou mais tempo do que ela durou.
  const areaMap = new Map<string, number>();
  servicos.forEach((s) => areaMap.set(s.area, (areaMap.get(s.area) ?? 0) + parseHoras(s.tempoGasto)));
  const horasPorSetor = Array.from(areaMap.entries()).map(([setor, horas]) => ({
    setor,
    horas: duracaoMaximaHoras ? Math.min(Math.round(horas), duracaoMaximaHoras) : Math.round(horas),
  }));

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
