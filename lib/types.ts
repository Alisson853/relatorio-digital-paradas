export type StatusGeral = "concluida" | "ressalvas" | "em_andamento";
export type StatusItem = "concluido" | "atrasado" | "pendente" | "em_andamento";
export type Equipe = "Elétrica" | "Mecânica" | "Instrumentação" | "Operação" | "Segurança" | "Civil" | "Caldeiraria" | "Preditiva" | "Lubrificação";

// Categorias fechadas pro motivo de "não será feito" — texto livre não dava
// pra agrupar (cada técnico escreve diferente pra dizer a mesma coisa), o que
// impedia enxergar "essa causa se repete" tanto no alerta de histórico quanto
// numa visão geral do dashboard.
export const MOTIVOS_NAO_FEITO = ["Falta de Material", "Falta de Tempo", "Falta de Recurso/Equipe", "Equipamento Indisponível", "Outro"] as const;
export type MotivoNaoFeitoCategoria = (typeof MOTIVOS_NAO_FEITO)[number];

export interface ParadaResumo {
  id: string;
  nome: string;
  maquina: string;
  area: string;
  data: string;
  duracaoPlanejada: string;
  duracaoRealizada: string;
  status: StatusGeral;
  responsavel: string;
  imagem: string;
  fotosMaquina?: string[];
}

export interface Kpis {
  osPlanejadas: number;
  osConcluidas: number;
  eficiencia: number;
  horasTrabalhadas: number;
  equipeEletrica: number;
  equipeMecanica: number;
  equipeInstrumentacao: number;
  seguranca: number;
  pendencias: number;
  etiquetaVermelha: number;
  etiquetaAmarela: number;
}

export interface TimelineEvento {
  id: string;
  horario: string;
  titulo: string;
  responsavel: string;
  descricao: string;
  icone: "flag" | "lock" | "wrench" | "swap" | "search" | "check-circle" | "play" | "unlock";
  status: StatusItem;
}

export interface Servico {
  id: string;
  numeroOS: string;
  titulo: string;
  equipamento: string;
  area: string;
  responsavel: string;
  equipe: Equipe;
  horaInicio: string;
  horaFim: string;
  tempoGasto: string;
  problemaIdentificado: string;
  servicoExecutado: string;
  resultado: string;
  status: StatusItem;
  fotoAntes: string;
  fotoAntesHorario?: string;
  fotoDurante?: string;
  fotoDuranteHorario?: string;
  fotoDepois: string;
  fotoDepoisHorario?: string;
  categoria?: string;
  // Marcado pelo técnico em campo quando o serviço não vai ser feito. A
  // categoria É o sinal de "está marcado" (undefined = não marcado) — o
  // texto é só um detalhe opcional que complementa a categoria, nunca
  // sozinho. Só aparece pro editor, num painel à parte na tela principal —
  // não é mostrado na apresentação.
  naoFeitoCategoria?: MotivoNaoFeitoCategoria;
  justificativaNaoFeito?: string;
}

export interface FotoGaleria {
  id: string;
  categoria: "antes" | "durante" | "depois";
  servico: string;
  area: string;
  url: string;
}

export interface Pendencia {
  id: string;
  item: string;
  motivo: string;
}

export interface CaminhoCriticoItem {
  id: string;
  servico: string;
  inicioPlanejado: string;
  fimPlanejado: string;
  inicioReal: string;
  fimReal: string;
  diferencaMin: number;
  responsavel: string;
  status: StatusItem;
  causaAtraso?: string;
}

export interface OsPorEquipeDado {
  equipe: string;
  quantidade: number;
}

export interface HorasPorSetorDado {
  setor: string;
  horas: number;
}

export interface HorasPorServicoDado {
  servico: string;
  horas: number;
}

export interface DistribuicaoServicoDado {
  categoria: string;
  valor: number;
}

export interface ParetoAtrasoDado {
  causa: string;
  horas: number;
  acumulado: number;
}

export interface PlanejadoRealizadoDado {
  etapa: string;
  planejado: number;
  realizado: number;
}

export interface GraficosData {
  osPorEquipe: OsPorEquipeDado[];
  horasPorSetor: HorasPorSetorDado[];
  horasPorServico: HorasPorServicoDado[];
  distribuicaoServicos: DistribuicaoServicoDado[];
  paretoAtrasos: ParetoAtrasoDado[];
  planejadoRealizado: PlanejadoRealizadoDado[];
  percentualConcluido: number;
}

export interface ResultadoFinal {
  tempoPlanejadoHoras: number;
  tempoRealizadoHoras: number;
  eficiencia: number;
  disponibilidade: number;
  pendenciasAbertas: number;
  selo: StatusGeral;
  resumo: string;
}

export interface ParadaCompleta {
  resumo: ParadaResumo;
  kpis: Kpis;
  timeline: TimelineEvento[];
  servicos: Servico[];
  fotos: FotoGaleria[];
  caminhoCritico: CaminhoCriticoItem[];
  pendencias: Pendencia[];
  graficos: GraficosData;
  resultadoFinal: ResultadoFinal;
}
