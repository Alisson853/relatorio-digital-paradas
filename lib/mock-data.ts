import type {
  ParadaResumo,
  ParadaCompleta,
  Kpis,
  TimelineEvento,
  Servico,
  FotoGaleria,
  CaminhoCriticoItem,
  Pendencia,
  GraficosData,
  ResultadoFinal,
  Equipe,
  StatusItem,
} from "./types";

// ---------- PRNG determinístico (mesmo id sempre gera os mesmos dados) ----------
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFromId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h << 5) - h + id.charCodeAt(i);
    h |= 0;
  }
  return h;
}

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function pickMany<T>(rng: () => number, arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => rng() - 0.5);
  return shuffled.slice(0, n);
}

function randInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function padTime(n: number): string {
  return n.toString().padStart(2, "0");
}

// ---------- Dados fixos das paradas do dashboard ----------
export const PARADAS_RESUMO: ParadaResumo[] = [
  {
    id: "prensa-hidraulica-01",
    nome: "Parada Geral — Prensa Hidráulica 01",
    maquina: "Prensa Hidráulica 01",
    area: "Estamparia",
    data: "2026-07-14",
    duracaoPlanejada: "48h",
    duracaoRealizada: "51h 20min",
    status: "ressalvas",
    responsavel: "Carlos Eduardo Souza",
    imagem: "industrial-press",
  },
  {
    id: "forno-fusao-02",
    nome: "Parada Programada — Forno de Fusão 02",
    maquina: "Forno de Fusão 02",
    area: "Fundição",
    data: "2026-06-02",
    duracaoPlanejada: "72h",
    duracaoRealizada: "70h 10min",
    status: "concluida",
    responsavel: "Fernanda Lima Rocha",
    imagem: "furnace",
  },
  {
    id: "compressor-central-03",
    nome: "Manutenção Preventiva — Compressor Central 03",
    maquina: "Compressor Central 03",
    area: "Utilidades",
    data: "2026-05-18",
    duracaoPlanejada: "24h",
    duracaoRealizada: "23h 45min",
    status: "concluida",
    responsavel: "Ricardo Nogueira Alves",
    imagem: "compressor",
  },
  {
    id: "linha-envase-04",
    nome: "Parada de Modernização — Linha de Envase 04",
    maquina: "Linha de Envase 04",
    area: "Envase",
    data: "2026-04-22",
    duracaoPlanejada: "36h",
    duracaoRealizada: "40h 05min",
    status: "ressalvas",
    responsavel: "Juliana Prado Martins",
    imagem: "bottling-line",
  },
  {
    id: "caldeira-industrial-05",
    nome: "Parada Anual — Caldeira Industrial 05",
    maquina: "Caldeira Industrial 05",
    area: "Geração de Vapor",
    data: "2026-03-10",
    duracaoPlanejada: "96h",
    duracaoRealizada: "94h 30min",
    status: "concluida",
    responsavel: "Marcos Vinícius Teixeira",
    imagem: "boiler",
  },
  {
    id: "esteira-transportadora-06",
    nome: "Parada Corretiva — Esteira Transportadora 06",
    maquina: "Esteira Transportadora 06",
    area: "Logística Interna",
    data: "2026-08-01",
    duracaoPlanejada: "12h",
    duracaoRealizada: "12h 40min",
    status: "em_andamento",
    responsavel: "Patrícia Gomes Ferreira",
    imagem: "conveyor",
  },
];

// ---------- Geradores por seção ----------
const NOMES = [
  "André Silva", "Beatriz Cardoso", "Caio Ferreira", "Débora Santos", "Eduardo Nunes",
  "Fabiana Rocha", "Gustavo Melo", "Helena Barros", "Igor Castro", "Joana Pires",
  "Leonardo Dias", "Mariana Costa", "Nelson Araújo", "Otávio Ramos", "Paula Vidal",
  "Rafael Moura", "Sabrina Lopes", "Tiago Batista", "Vanessa Cruz", "William Torres",
];

const EQUIPES: Equipe[] = ["Elétrica", "Mecânica", "Instrumentação", "Operação", "Segurança", "Civil"];

const EQUIPAMENTOS = [
  "Motor Principal", "Redutor de Velocidade", "Painel Elétrico", "Válvula de Controle",
  "Rolamento do Eixo", "Sistema de Refrigeração", "Bomba Hidráulica", "Sensor de Pressão",
  "Correia Transportadora", "Acoplamento Mecânico", "Quadro de Comando", "Trocador de Calor",
  "Sistema de Lubrificação", "Cilindro Pneumático", "Inversor de Frequência", "Bico Injetor",
  "Filtro Industrial", "Vedação Mecânica", "Estrutura Metálica", "Painel de Instrumentação",
];

const PROBLEMAS = [
  "Desgaste excessivo identificado em inspeção preventiva",
  "Vibração acima do limite operacional aceitável",
  "Vazamento de óleo detectado durante ronda técnica",
  "Corrosão avançada na estrutura de sustentação",
  "Folga excessiva no acoplamento mecânico",
  "Ruído anormal durante operação em carga máxima",
  "Temperatura de operação acima do especificado",
  "Falha intermitente reportada pela operação",
];

const RESULTADOS = [
  "Equipamento normalizado e testado com sucesso",
  "Peça substituída, funcionamento dentro dos parâmetros",
  "Reparo concluído, sem recorrência durante partida",
  "Ajuste realizado, vibração dentro da faixa aceitável",
  "Componente recondicionado e recolocado em operação",
];

const ACOES = [
  "Manutenção Preventiva em",
  "Substituição de Componente em",
  "Inspeção Técnica em",
  "Reparo Emergencial em",
  "Instalação de Melhoria em",
  "Ajuste e Calibração em",
  "Manutenção Corretiva em",
  "Revisão Geral em",
];

const PENDENCIAS_MOTIVOS = [
  "Peça de reposição não chegou a tempo",
  "Aguardando liberação de área para conclusão",
  "Necessária parada adicional programada",
  "Falta de mão de obra especializada disponível",
  "Aguardando laudo técnico do fabricante",
];

function gerarPendencias(rng: () => number, quantidade: number): Pendencia[] {
  const pendencias: Pendencia[] = [];
  for (let i = 0; i < quantidade; i++) {
    pendencias.push({
      id: `pend-${i}`,
      item: `${pick(rng, ACOES)} ${pick(rng, EQUIPAMENTOS)}`,
      motivo: pick(rng, PENDENCIAS_MOTIVOS),
    });
  }
  return pendencias;
}

function gerarKpis(rng: () => number): Kpis {
  const osPlanejadas = randInt(rng, 42, 55);
  const osConcluidas = osPlanejadas - randInt(rng, 0, 4);
  return {
    osPlanejadas,
    osConcluidas,
    eficiencia: Math.round((osConcluidas / osPlanejadas) * 1000) / 10,
    horasTrabalhadas: randInt(rng, 380, 620),
    equipeEletrica: randInt(rng, 6, 14),
    equipeMecanica: randInt(rng, 8, 18),
    seguranca: 100,
    pendencias: osPlanejadas - osConcluidas,
  };
}

function gerarTimeline(rng: () => number): TimelineEvento[] {
  const base: Array<[string, TimelineEvento["icone"], string]> = [
    ["Início da Parada", "flag", "Liberação da área e comunicação geral de início dos trabalhos"],
    ["Bloqueio e Etiquetagem (LOTO)", "lock", "Aplicação de travas e etiquetas em todas as fontes de energia"],
    ["Desmontagem de Componentes", "wrench", "Remoção de componentes para inspeção e substituição"],
    ["Inspeção Técnica Inicial", "search", "Avaliação detalhada do estado dos equipamentos"],
    ["Troca de Componentes Críticos", "swap", "Substituição de peças identificadas em inspeção"],
    ["Manutenção Elétrica", "wrench", "Intervenção em painéis e sistemas de comando"],
    ["Manutenção Mecânica", "wrench", "Intervenção em rolamentos, acoplamentos e estruturas"],
    ["Inspeção Intermediária", "search", "Checagem de progresso e conformidade dos serviços"],
    ["Montagem de Componentes", "wrench", "Remontagem dos itens substituídos e revisados"],
    ["Testes Funcionais", "check-circle", "Testes de funcionamento sem carga"],
    ["Testes em Carga", "check-circle", "Testes de operação com carga controlada"],
    ["Remoção de Bloqueios (LOTO)", "unlock", "Retirada das travas e etiquetas de segurança"],
    ["Partida do Equipamento", "play", "Acionamento e estabilização do equipamento"],
    ["Inspeção Final", "search", "Vistoria final de segurança e qualidade"],
    ["Liberação para Operação", "flag", "Entrega formal do equipamento à operação"],
  ];

  let hora = 6;
  let minuto = 0;
  return base.map(([titulo, icone, descricao], i) => {
    minuto += randInt(rng, 20, 90);
    if (minuto >= 60) {
      hora += Math.floor(minuto / 60);
      minuto = minuto % 60;
    }
    hora = hora % 24;
    const status: StatusItem = i < base.length - 3 ? "concluido" : i === base.length - 1 ? "pendente" : "em_andamento";
    return {
      id: `evt-${i}`,
      horario: `${padTime(hora)}:${padTime(minuto)}`,
      titulo,
      responsavel: pick(rng, NOMES),
      descricao,
      icone,
      status: i < 12 ? "concluido" : status,
    };
  });
}

function gerarServicos(rng: () => number, quantidade: number): Servico[] {
  const servicos: Servico[] = [];
  for (let i = 0; i < quantidade; i++) {
    const equipamento = pick(rng, EQUIPAMENTOS);
    const numero = randInt(rng, 100, 999);
    const statusRoll = rng();
    const status: StatusItem = statusRoll > 0.85 ? "atrasado" : statusRoll > 0.75 ? "em_andamento" : "concluido";
    const horaInicio = randInt(rng, 6, 20);
    const duracaoHoras = randInt(rng, 1, 8);
    servicos.push({
      id: `srv-${i}`,
      numeroOS: `${randInt(rng, 10000, 99999)}`,
      titulo: `${pick(rng, ACOES)} ${equipamento}`,
      equipamento: `${equipamento} — Nº ${numero}`,
      area: pick(rng, ["Estamparia", "Fundição", "Utilidades", "Envase", "Geração de Vapor", "Logística Interna"]),
      responsavel: pick(rng, NOMES),
      equipe: pick(rng, EQUIPES),
      horaInicio: `${padTime(horaInicio)}:00`,
      horaFim: `${padTime((horaInicio + duracaoHoras) % 24)}:00`,
      tempoGasto: `${duracaoHoras}h ${randInt(rng, 0, 5) * 10}min`,
      problemaIdentificado: pick(rng, PROBLEMAS),
      servicoExecutado: `Execução de manutenção corretiva/preventiva em ${equipamento.toLowerCase()}, incluindo desmontagem, limpeza técnica, substituição de itens de desgaste e testes funcionais.`,
      resultado: pick(rng, RESULTADOS),
      status,
      fotoAntes: `https://picsum.photos/seed/${equipamento.replace(/\s/g, "")}-antes-${i}/640/480`,
      fotoDepois: `https://picsum.photos/seed/${equipamento.replace(/\s/g, "")}-depois-${i}/640/480`,
    });
  }
  return servicos;
}

function gerarFotos(rng: () => number, servicos: Servico[], quantidade: number): FotoGaleria[] {
  const fotos: FotoGaleria[] = [];
  const base = pickMany(rng, servicos, Math.min(quantidade / 2, servicos.length));
  base.forEach((s, i) => {
    fotos.push({
      id: `foto-antes-${i}`,
      categoria: "antes",
      servico: s.equipamento,
      area: s.area,
      url: s.fotoAntes,
    });
    fotos.push({
      id: `foto-depois-${i}`,
      categoria: "depois",
      servico: s.equipamento,
      area: s.area,
      url: s.fotoDepois,
    });
  });
  return fotos;
}

function gerarCaminhoCritico(rng: () => number, servicos: Servico[]): CaminhoCriticoItem[] {
  return pickMany(rng, servicos, 8).map((s, i) => {
    const inicioPlan = randInt(rng, 6, 20);
    const duracaoPlan = randInt(rng, 2, 8);
    const atraso = rng() > 0.6 ? randInt(rng, 15, 180) : 0;
    const fimPlan = inicioPlan + duracaoPlan;
    const fimReal = fimPlan + Math.round(atraso / 60);
    return {
      id: `cc-${i}`,
      servico: s.equipamento,
      inicioPlanejado: `${padTime(inicioPlan % 24)}:00`,
      fimPlanejado: `${padTime(fimPlan % 24)}:00`,
      inicioReal: `${padTime(inicioPlan % 24)}:${padTime(randInt(rng, 0, 30))}`,
      fimReal: `${padTime(fimReal % 24)}:${padTime(randInt(rng, 0, 55))}`,
      diferencaMin: atraso,
      responsavel: s.responsavel,
      status: atraso > 60 ? "atrasado" : atraso > 0 ? "em_andamento" : "concluido",
    };
  });
}

function gerarGraficos(rng: () => number, kpis: Kpis): GraficosData {
  const osPorEquipe = EQUIPES.map((equipe) => ({ equipe, quantidade: randInt(rng, 3, 16) }));
  const horasPorSetor = ["Estamparia", "Fundição", "Utilidades", "Envase", "Manutenção Geral"].map((setor) => ({
    setor,
    horas: randInt(rng, 40, 160),
  }));
  const distribuicaoServicos = [
    { categoria: "Preventiva", valor: randInt(rng, 30, 50) },
    { categoria: "Corretiva", valor: randInt(rng, 20, 40) },
    { categoria: "Preditiva", valor: randInt(rng, 10, 25) },
    { categoria: "Melhoria", valor: randInt(rng, 5, 15) },
  ];
  let acumulado = 0;
  const causas = ["Falta de Material", "Mão de Obra", "Retrabalho", "Liberação de Área", "Segurança"];
  const paretoAtrasos = causas
    .map((causa) => ({ causa, horas: randInt(rng, 2, 24) }))
    .sort((a, b) => b.horas - a.horas)
    .map((item) => {
      acumulado += item.horas;
      return { ...item, acumulado };
    });
  const planejadoRealizado = ["Desmontagem", "Inspeção", "Substituição", "Testes", "Partida"].map((etapa) => ({
    etapa,
    planejado: randInt(rng, 4, 16),
    realizado: randInt(rng, 4, 18),
  }));
  return {
    osPorEquipe,
    horasPorSetor,
    distribuicaoServicos,
    paretoAtrasos,
    planejadoRealizado,
    percentualConcluido: kpis.eficiencia,
  };
}

export function gerarResultadoFinal(resumo: ParadaResumo, kpis: Kpis): ResultadoFinal {
  const planMatch = resumo.duracaoPlanejada.match(/\d+/);
  const realMatch = resumo.duracaoRealizada.match(/\d+/);
  const tempoPlanejadoHoras = planMatch ? Number(planMatch[0]) : 48;
  const tempoRealizadoHoras = realMatch ? Number(realMatch[0]) : 50;
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

export function gerarParadaCompleta(id: string): ParadaCompleta | null {
  const resumo = PARADAS_RESUMO.find((p) => p.id === id);
  if (!resumo) return null;

  const rng = mulberry32(seedFromId(id));
  const kpis = gerarKpis(rng);
  const timeline = gerarTimeline(rng);
  const servicos = gerarServicos(rng, randInt(rng, 46, 52));
  const fotos = gerarFotos(rng, servicos, 30);
  const caminhoCritico = gerarCaminhoCritico(rng, servicos);
  const pendencias = gerarPendencias(rng, kpis.pendencias);
  const graficos = gerarGraficos(rng, kpis);
  const resultadoFinal = gerarResultadoFinal(resumo, kpis);

  return { resumo, kpis, timeline, servicos, fotos, caminhoCritico, pendencias, graficos, resultadoFinal };
}
