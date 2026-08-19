import type {
  CaminhoCriticoItem,
  FotoGaleria,
  GraficosData,
  Kpis,
  ParadaCompleta,
  ParadaResumo,
  Pendencia,
  ResultadoFinal,
  Servico,
  TimelineEvento,
} from "./types";
import { NO_PHOTO_PLACEHOLDER } from "./image-utils";

const FOTOS_DIR = "/relatorios/mp09-preventiva";

export const PARADAS_RESUMO: ParadaResumo[] = [
  {
    id: "preventiva-mp09-15-07-2026",
    nome: "Relatório Preventiva MP09",
    maquina: "Máquina de Papel 09",
    area: "Santher — Unidade Guaíba",
    data: "2026-07-15",
    duracaoPlanejada: "8h",
    duracaoRealizada: "10h",
    status: "ressalvas",
    responsavel: "Equipe de Manutenção MP09",
    imagem: "conveyor",
    fotosMaquina: [`${FOTOS_DIR}/maquina-principal.jpg`],
  },
];

export function gerarResultadoFinal(resumo: ParadaResumo, kpis: Kpis): ResultadoFinal {
  const planMatch = resumo.duracaoPlanejada.match(/\d+/);
  const realMatch = resumo.duracaoRealizada.match(/\d+/);
  const tempoPlanejadoHoras = planMatch ? Number(planMatch[0]) : 8;
  const tempoRealizadoHoras = realMatch ? Number(realMatch[0]) : 10;
  const disponibilidade = Math.round((tempoPlanejadoHoras / tempoRealizadoHoras) * 1000) / 10;
  return {
    tempoPlanejadoHoras,
    tempoRealizadoHoras,
    eficiencia: kpis.eficiencia,
    disponibilidade,
    pendenciasAbertas: kpis.pendencias,
    selo: resumo.status,
    resumo:
      resumo.status === "concluida"
        ? "Parada executada dentro do planejado, com todos os serviços críticos concluídos e equipamento liberado para operação em plena capacidade."
        : resumo.status === "ressalvas"
        ? "Parada concluída com pequenos desvios de prazo e pendências pontuais, já endereçadas em plano de ação de curto prazo."
        : "Parada em andamento, com execução dentro dos padrões técnicos e de segurança estabelecidos.",
  };
}

function servicosMp09(): Servico[] {
  return [
    {
      id: "srv-1",
      numeroOS: "53.298",
      titulo: "Substituição do Rolamento do Motor",
      equipamento: "Bomba de Alta Pressão",
      area: "Porão MP09",
      responsavel: "Equipe Mecânica",
      equipe: "Mecânica",
      horaInicio: "08:00",
      horaFim: "09:00",
      tempoGasto: "1h",
      problemaIdentificado: "Foi identificado defeito na pista interna do rolamento LOA.",
      servicoExecutado:
        "Foi realizada a substituição do rolamento LOA, devido à identificação de defeito na pista interna e necessidade de intervenção corretiva no equipamento.",
      resultado: "Após a substituição, o equipamento foi verificado e permaneceu em condição adequada para operação, sem anormalidades aparentes.",
      status: "concluido",
      categoria: "Corretiva",
      fotoAntes: NO_PHOTO_PLACEHOLDER,
      fotoDepois: `${FOTOS_DIR}/srv1-depois.jpg`,
    },
    {
      id: "srv-2",
      numeroOS: "53.309",
      titulo: "Limpeza da Softstarter da Bomba do Tanque 12",
      equipamento: "Painel Elétrico da Bomba do Tanque 12",
      area: "Em Frente à Refinação",
      responsavel: "Equipe Elétrica",
      equipe: "Elétrica",
      horaInicio: "08:00",
      horaFim: "09:00",
      tempoGasto: "1h",
      problemaIdentificado:
        "Foi identificada a necessidade de limpeza na softstarter da bomba do Tanque 12, devido ao acúmulo de sujeira e resíduos que poderiam comprometer a ventilação, o resfriamento e o funcionamento adequado do componente.",
      servicoExecutado:
        "Foi realizada a limpeza da softstarter da bomba do Tanque 12, com o objetivo de manter as condições adequadas de operação do sistema elétrico.",
      resultado:
        "Após a limpeza, a softstarter foi verificada e permaneceu em condição adequada para operação, com melhor condição de ventilação e sem anormalidades aparentes.",
      status: "concluido",
      categoria: "Preventiva",
      fotoAntes: NO_PHOTO_PLACEHOLDER,
      fotoDepois: `${FOTOS_DIR}/srv2-depois.jpg`,
    },
    {
      id: "srv-3",
      numeroOS: "53.293",
      titulo: "Substituição do Rolamento LA do Motor da Bomba do Tanque 15",
      equipamento: "Motor da Bomba do Tanque 15",
      area: "Porão MP09",
      responsavel: "Equipe Mecânica",
      equipe: "Mecânica",
      horaInicio: "09:00",
      horaFim: "17:00",
      tempoGasto: "8h",
      problemaIdentificado:
        "Foi identificado defeito na pista externa do rolamento LA do motor, condição que poderia causar ruído anormal, vibração, aquecimento e possível falha no funcionamento do conjunto.",
      servicoExecutado:
        "Foi realizada a substituição do rolamento LA do motor, devido à identificação de defeito na pista externa e necessidade de intervenção corretiva no equipamento.",
      resultado: "Após a substituição, o motor foi verificado e permaneceu em condição adequada para operação, sem anormalidades aparentes.",
      status: "concluido",
      categoria: "Corretiva",
      fotoAntes: NO_PHOTO_PLACEHOLDER,
      fotoDepois: `${FOTOS_DIR}/srv3-depois.jpg`,
    },
    {
      id: "srv-4",
      numeroOS: "53.293",
      titulo: "Substituição do Rolamento da Bomba do Tanque 15",
      equipamento: "Bomba do Tanque 15",
      area: "Porão MP09",
      responsavel: "Equipe Mecânica",
      equipe: "Mecânica",
      horaInicio: "09:00",
      horaFim: "17:00",
      tempoGasto: "8h",
      problemaIdentificado:
        "Foi identificada a necessidade de substituição do rolamento da bomba do Tanque 15, devido à condição inadequada do componente, podendo causar ruído, vibração, aquecimento ou falha no funcionamento do conjunto.",
      servicoExecutado:
        "Foi realizada a substituição do rolamento da bomba do Tanque 15, com o objetivo de restabelecer as condições adequadas de funcionamento do equipamento.",
      resultado:
        "Após a substituição, a bomba do Tanque 15 foi verificada e permaneceu em condição adequada para operação, sem anormalidades aparentes.",
      status: "concluido",
      categoria: "Corretiva",
      fotoAntes: `${FOTOS_DIR}/srv4-antes.jpg`,
      fotoDurante: `${FOTOS_DIR}/srv4-durante.jpg`,
      fotoDepois: `${FOTOS_DIR}/srv4-depois.jpg`,
    },
    {
      id: "srv-5",
      numeroOS: "5.922",
      titulo: "Inspeção das Correias da MP09",
      equipamento: "Máquina de Papel MP09",
      area: "MP09",
      responsavel: "Equipe Mecânica",
      equipe: "Mecânica",
      horaInicio: "09:00",
      horaFim: "17:00",
      tempoGasto: "8h",
      problemaIdentificado:
        "Foi identificada a necessidade de inspeção das correias da MP09, visando verificar as condições de desgaste, tensionamento, alinhamento e possíveis anormalidades que poderiam comprometer o funcionamento do conjunto.",
      servicoExecutado:
        "Foi realizada a inspeção das correias da MP09, contemplando a verificação visual dos componentes, análise das condições de desgaste, conferência do tensionamento, alinhamento e fixação do conjunto.",
      resultado: "Após a inspeção, as correias foram verificadas e permaneceram em condição adequada para operação, sem anormalidades aparentes.",
      status: "concluido",
      categoria: "Preventiva",
      fotoAntes: `${FOTOS_DIR}/srv5-antes.jpg`,
      fotoDurante: `${FOTOS_DIR}/srv5-durante.jpg`,
      fotoDepois: `${FOTOS_DIR}/srv5-depois.jpg`,
    },
    {
      id: "srv-6",
      numeroOS: "53.298",
      titulo: "Substituição do Rolamento LC da Posição 22",
      equipamento: "Máquina de Papel MP09",
      area: "MP09",
      responsavel: "Equipe Mecânica",
      equipe: "Mecânica",
      horaInicio: "08:00",
      horaFim: "09:00",
      tempoGasto: "1h",
      problemaIdentificado:
        "Foi identificada a necessidade de substituição do rolamento LC da Posição 22, devido à condição inadequada do componente, podendo causar ruído, vibração, aquecimento ou falha no funcionamento do conjunto.",
      servicoExecutado:
        "Foi realizada a substituição do rolamento LC da Posição 22, com o objetivo de restabelecer as condições adequadas de operação do equipamento.",
      resultado: "Equipamento liberado para operação, sem ruídos anormais ou aquecimento excessivo.",
      status: "concluido",
      categoria: "Corretiva",
      fotoAntes: `${FOTOS_DIR}/srv6-antes.jpg`,
      fotoDurante: `${FOTOS_DIR}/srv6-durante.jpg`,
      fotoDepois: `${FOTOS_DIR}/srv6-depois.jpg`,
    },
    {
      id: "srv-7",
      numeroOS: "53.114",
      titulo: "Instalação da Estrutura de Aterramento para Rede Profibus da MP09",
      equipamento: "Rede Profibus MP09",
      area: "MP09",
      responsavel: "Equipe Elétrica",
      equipe: "Elétrica",
      horaInicio: "08:00",
      horaFim: "16:00",
      tempoGasto: "8h",
      problemaIdentificado:
        "Foi identificada a necessidade de adequação da estrutura de aterramento da rede Profibus da MP09, visando melhorar a proteção elétrica, reduzir interferências e garantir maior estabilidade na comunicação dos dispositivos da rede.",
      servicoExecutado:
        "Foi realizada a instalação da estrutura de aterramento para a rede Profibus da MP09, contemplando a preparação dos pontos de fixação, instalação dos componentes de aterramento, organização dos cabos e conferência das conexões.",
      resultado:
        "Após a instalação, a estrutura de aterramento foi verificada e permaneceu em condição adequada, contribuindo para maior confiabilidade e estabilidade da rede Profibus da MP09.",
      status: "concluido",
      categoria: "Melhoria",
      fotoAntes: `${FOTOS_DIR}/srv7-antes.jpg`,
      fotoDurante: `${FOTOS_DIR}/srv7-durante.jpg`,
      fotoDepois: `${FOTOS_DIR}/srv7-depois.jpg`,
    },
    {
      id: "srv-8",
      numeroOS: "53.295",
      titulo: "Substituição do Rolamento da Bomba 2º Estágio com Defeito na Pista Interna",
      equipamento: "Bomba 2º Estágio",
      area: "Porão MP09",
      responsavel: "Equipe Mecânica",
      equipe: "Mecânica",
      horaInicio: "10:00",
      horaFim: "16:00",
      tempoGasto: "6h",
      problemaIdentificado:
        "Foi identificado defeito na pista interna do rolamento da bomba 2º estágio, condição que poderia causar ruído anormal, vibração, aquecimento e possível falha no funcionamento do conjunto.",
      servicoExecutado:
        "Foi realizada a substituição do rolamento da bomba 2º estágio, devido à identificação de defeito na pista interna e necessidade de intervenção corretiva no equipamento.",
      resultado: "Após a substituição, a bomba 2º estágio foi verificada e permaneceu em condição adequada para operação, sem anormalidades aparentes.",
      status: "concluido",
      categoria: "Corretiva",
      fotoAntes: `${FOTOS_DIR}/srv8-antes.jpg`,
      fotoDepois: `${FOTOS_DIR}/srv8-depois.jpg`,
    },
    {
      id: "srv-9",
      numeroOS: "Etiqueta Amarela",
      titulo: "Serviço Extra — Soldagem na Base do Hidrapulper 16",
      equipamento: "Hidrapulper 16",
      area: "MP09",
      responsavel: "Soldador Bruno",
      equipe: "Mecânica",
      horaInicio: "",
      horaFim: "",
      tempoGasto: "1h",
      problemaIdentificado:
        "Serviço não previsto inicialmente, identificado durante a parada. Foi identificada a necessidade de soldagem na base do Hidrapulper 16, devido à condição estrutural inadequada no ponto de fixação, podendo comprometer a estabilidade do conjunto durante a operação.",
      servicoExecutado:
        "Foi realizada soldagem na base do Hidrapulper 16, com o objetivo de reforçar a estrutura e restabelecer as condições adequadas de fixação e estabilidade do equipamento.",
      resultado: "Equipamento liberado para operação, com a estrutura de fixação reforçada e sem anormalidades aparentes.",
      status: "concluido",
      categoria: "Corretiva",
      fotoAntes: NO_PHOTO_PLACEHOLDER,
      fotoDepois: `${FOTOS_DIR}/srv9-depois.jpg`,
    },
  ];
}

function timelineMp09(): TimelineEvento[] {
  return [
    {
      id: "tl-1",
      horario: "—",
      titulo: "Reunião Pré-Preventiva (13/07)",
      responsavel: "Jaques",
      descricao: "Alinhamento das atividades com Jaques, Madson, Fernando, Bruno, Talia, Marcelo Nicola e Diego.",
      icone: "flag",
      status: "concluido",
    },
    {
      id: "tl-2",
      horario: "08:00",
      titulo: "Início dos Serviços",
      responsavel: "Equipe de Manutenção",
      descricao: "Início das intervenções mecânicas e elétricas programadas na MP09.",
      icone: "wrench",
      status: "concluido",
    },
    {
      id: "tl-3",
      horario: "09:00",
      titulo: "Substituição de Rolamentos",
      responsavel: "Equipe Mecânica",
      descricao: "Início da substituição dos rolamentos das bombas do Tanque 15 e da MP09.",
      icone: "swap",
      status: "concluido",
    },
    {
      id: "tl-4",
      horario: "13:00",
      titulo: "Identificação do Serviço Extra",
      responsavel: "Inspeção de Segurança",
      descricao: "Identificada anomalia estrutural na base do Hidrapulper 16 (etiqueta amarela nº 8475), não prevista no escopo inicial.",
      icone: "search",
      status: "concluido",
    },
    {
      id: "tl-5",
      horario: "16:00",
      titulo: "Encerramento da Parada",
      responsavel: "Equipe de Manutenção",
      descricao: "Conclusão dos serviços programados e liberação gradual dos equipamentos para operação.",
      icone: "check-circle",
      status: "concluido",
    },
  ];
}

function caminhoCriticoMp09(servicos: Servico[]): CaminhoCriticoItem[] {
  return servicos
    .filter((s) => s.horaInicio && s.horaFim)
    .map((s, i) => ({
      id: `cc-${i}`,
      servico: s.titulo,
      inicioPlanejado: s.horaInicio,
      fimPlanejado: s.horaFim,
      inicioReal: s.horaInicio,
      fimReal: s.horaFim,
      diferencaMin: 0,
      responsavel: s.responsavel,
      status: "concluido",
    }));
}

function fotosMp09(servicos: Servico[]): FotoGaleria[] {
  const fotos: FotoGaleria[] = [];
  servicos.forEach((s) => {
    if (s.fotoAntes && s.fotoAntes !== NO_PHOTO_PLACEHOLDER) {
      fotos.push({ id: `${s.id}-antes`, categoria: "antes", servico: s.titulo, area: s.area, url: s.fotoAntes });
    }
    if (s.fotoDurante) {
      fotos.push({ id: `${s.id}-durante`, categoria: "durante", servico: s.titulo, area: s.area, url: s.fotoDurante });
    }
    if (s.fotoDepois && s.fotoDepois !== NO_PHOTO_PLACEHOLDER) {
      fotos.push({ id: `${s.id}-depois`, categoria: "depois", servico: s.titulo, area: s.area, url: s.fotoDepois });
    }
  });
  return fotos;
}

function kpisMp09(): Kpis {
  return {
    osPlanejadas: 49,
    osConcluidas: 40,
    eficiencia: 82,
    horasTrabalhadas: 26,
    equipeEletrica: 7,
    equipeMecanica: 39,
    equipeInstrumentacao: 3,
    seguranca: 100,
    pendencias: 9,
    etiquetaVermelha: 0,
    etiquetaAmarela: 0,
  };
}

function graficosMp09(kpis: Kpis): GraficosData {
  return {
    osPorEquipe: [
      { equipe: "Mecânica", quantidade: 39 },
      { equipe: "Elétrica", quantidade: 7 },
      { equipe: "Instrumentação", quantidade: 3 },
    ],
    horasPorSetor: [
      { setor: "Mecânica", horas: 9 },
      { setor: "Elétrica", horas: 9 },
      { setor: "Instrumentação", horas: 8 },
    ],
    distribuicaoServicos: [
      { categoria: "Corretiva", valor: 6 },
      { categoria: "Preventiva", valor: 2 },
      { categoria: "Melhoria", valor: 1 },
    ],
    paretoAtrasos: [{ causa: "Sem atrasos registrados por atividade", horas: 0, acumulado: 0 }],
    planejadoRealizado: [{ etapa: "Parada Geral", planejado: 8, realizado: 10 }],
    percentualConcluido: kpis.eficiencia,
  };
}

function pendenciasMp09(): Pendencia[] {
  return [
    {
      id: "pend-1",
      item: "9 ordens de serviço programadas",
      motivo: "Não concluídas dentro da janela da parada — 40 de 49 OS programadas foram executadas (82%).",
    },
  ];
}

export function gerarParadaCompleta(id: string): ParadaCompleta | null {
  const resumo = PARADAS_RESUMO.find((p) => p.id === id);
  if (!resumo) return null;

  const servicos = servicosMp09();
  const kpis = kpisMp09();
  const timeline = timelineMp09();
  const caminhoCritico = caminhoCriticoMp09(servicos);
  const fotos = fotosMp09(servicos);
  const graficos = graficosMp09(kpis);
  const pendencias = pendenciasMp09();
  const resultadoFinal = gerarResultadoFinal(resumo, kpis);

  return { resumo, kpis, timeline, servicos, fotos, caminhoCritico, pendencias, graficos, resultadoFinal };
}
