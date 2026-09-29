import type { ParadaRow } from "@/lib/db/schema";
import type { Servico } from "@/lib/types";

// Fábrica de um Servico mínimo válido, com overrides pontuais — cada teste só
// declara o que importa pro cenário dele, o resto vem de um padrão neutro.
export function criarServico(overrides: Partial<Servico> = {}): Servico {
  return {
    id: overrides.id ?? "srv-1",
    numeroOS: "12345",
    titulo: "Troca de rolamento",
    equipamento: "Motor 01",
    area: "Área 1",
    responsavel: "Fulano",
    equipe: "Mecânica",
    horaInicio: "08:00",
    horaFim: "10:00",
    tempoGasto: "2h",
    problemaIdentificado: "Rolamento com folga",
    servicoExecutado: "",
    resultado: "",
    status: "pendente",
    fotoAntes: "https://xyz.public.blob.vercel-storage.com/antes.jpg",
    fotoDepois: "https://xyz.public.blob.vercel-storage.com/depois.jpg",
    ...overrides,
  };
}

// Fábrica de uma linha completa de `paradas`, no formato que sai do banco —
// usada como ponto de partida de todo teste de lib/actions/paradas-logic.ts e
// lib/db/paradas-repo.ts.
export function criarParadaRow(overrides: Partial<ParadaRow> = {}): ParadaRow {
  const servicos = overrides.servicos ?? [criarServico()];
  return {
    id: "parada-1",
    nome: "Parada Geral MP09",
    maquina: "MP09",
    area: "Fábrica",
    data: "2026-01-10",
    duracaoPlanejada: "48h",
    duracaoRealizada: "50h",
    status: "em_andamento",
    responsavel: "Ciclano",
    imagem: "industrial-press",
    fotosMaquina: [],
    oficial: false,
    kpis: {
      osPlanejadas: servicos.length,
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
    },
    timeline: [],
    servicos,
    caminhoCritico: [],
    pendencias: [],
    graficos: {
      osPorEquipe: [],
      horasPorSetor: [],
      horasPorServico: [],
      distribuicaoServicos: [],
      paretoAtrasos: [],
      planejadoRealizado: [],
      percentualConcluido: 0,
    },
    resultadoFinal: {
      tempoPlanejadoHoras: 48,
      tempoRealizadoHoras: 50,
      eficiencia: 0,
      disponibilidade: 96,
      pendenciasAbertas: 0,
      selo: "em_andamento",
      resumo: "",
    },
    criadoEm: new Date("2026-01-10T08:00:00Z"),
    atualizadoEm: new Date("2026-01-10T08:00:00Z"),
    ...overrides,
  };
}
