export type StatusGeral = "concluida" | "ressalvas" | "em_andamento";
export type StatusItem = "concluido" | "atrasado" | "pendente" | "em_andamento";
export type Equipe = "Elétrica" | "Mecânica" | "Instrumentação" | "Operação" | "Segurança" | "Civil" | "Caldeiraria" | "Preditiva";

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
