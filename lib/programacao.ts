import type { Servico } from "./types";

export type Criticidade = "crítica" | "alta" | "média" | "baixa";

// Prioridade calculada a partir dos sinais que já existem no relatório.
export function classificarCriticidade(servico: Servico, candidatosCriticos: Servico[] = []): Criticidade {
  if (servico.categoria === "Etiqueta Vermelha" || servico.status === "atrasado") return "crítica";
  if (servico.categoria === "Etiqueta Amarela" || candidatosCriticos.some((item) => item.id === servico.id)) return "alta";
  if (servico.status === "pendente" || servico.categoria === "Corretiva") return "média";
  return "baixa";
}

export function horarioParaMinutos(horario: string): number | null {
  const match = horario.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hora = Number(match[1]);
  const minuto = Number(match[2]);
  return hora < 24 && minuto < 60 ? hora * 60 + minuto : null;
}

export function formatarHorario(minutos: number): string {
  const normalizado = ((minutos % 1440) + 1440) % 1440;
  return `${String(Math.floor(normalizado / 60)).padStart(2, "0")}:${String(normalizado % 60).padStart(2, "0")}`;
}

export interface ServicoProgramado extends Servico {
  inicioMinutos: number;
  fimMinutos: number;
}

export function servicosProgramados(servicos: Servico[]): ServicoProgramado[] {
  return servicos.flatMap((servico) => {
    const inicioMinutos = horarioParaMinutos(servico.horaInicio);
    const fimBase = horarioParaMinutos(servico.horaFim);
    if (inicioMinutos === null || fimBase === null || inicioMinutos === fimBase) return [];
    return [{ ...servico, inicioMinutos, fimMinutos: fimBase < inicioMinutos ? fimBase + 1440 : fimBase }];
  });
}

export interface ConflitoProgramacao {
  chave: string;
  tipo: "responsavel" | "equipe";
  servicos: [ServicoProgramado, ServicoProgramado];
}

export function detectarConflitosProgramacao(servicos: Servico[]): ConflitoProgramacao[] {
  const programados = servicosProgramados(servicos);
  const conflitos: ConflitoProgramacao[] = [];
  for (let i = 0; i < programados.length; i++) {
    for (let j = i + 1; j < programados.length; j++) {
      const a = programados[i]; const b = programados[j];
      if (a.inicioMinutos >= b.fimMinutos || b.inicioMinutos >= a.fimMinutos) continue;
      const responsavelA = a.responsavel.trim().toLocaleLowerCase();
      const responsavelB = b.responsavel.trim().toLocaleLowerCase();
      if (responsavelA && responsavelA === responsavelB) {
        conflitos.push({ chave: a.responsavel.trim(), tipo: "responsavel", servicos: [a, b] });
      } else if (!responsavelA && !responsavelB && a.equipe === b.equipe) {
        conflitos.push({ chave: a.equipe, tipo: "equipe", servicos: [a, b] });
      }
    }
  }
  return conflitos;
}

// Sem dependências explícitas entre atividades, não há como calcular o
// caminho crítico clássico. Estas são candidatas objetivas: tarefas que fecham
// por último em cada equipe e, portanto, não têm folga visível no cronograma.
export function candidatasCriticas(servicos: Servico[]): ServicoProgramado[] {
  const porEquipe = new Map<string, ServicoProgramado[]>();
  for (const servico of servicosProgramados(servicos)) {
    porEquipe.set(servico.equipe, [...(porEquipe.get(servico.equipe) ?? []), servico]);
  }
  return Array.from(porEquipe.values()).flatMap((itens) => {
    const fim = Math.max(...itens.map((item) => item.fimMinutos));
    return itens.filter((item) => item.fimMinutos === fim);
  });
}
