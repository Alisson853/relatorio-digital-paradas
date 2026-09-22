import type { MotivoNaoFeitoCategoria } from "@/lib/types";

// Histórico de serviços marcados "não será feito" em paradas passadas —
// compartilhado entre a Captura Rápida (celular, em campo), o formulário
// /novo (desktop, ao montar/importar o relatório) e o resumo do dashboard,
// pra alertar quando a mesma OS ou o mesmo equipamento reaparece: da última
// vez não foi feito, e por quê.
export interface HistoricoNaoFeitoItem {
  paradaId: string;
  paradaNome: string;
  paradaData: string;
  numeroOS: string;
  equipamento: string;
  categoria: MotivoNaoFeitoCategoria;
  justificativa: string;
}

function normalizar(texto: string): string {
  return texto.trim().toLowerCase().replace(/\s+/g, " ");
}

// Casa um serviço (da parada sendo criada/editada agora) contra o histórico
// de outras paradas. Prioriza o número da OS — é o identificador mais
// confiável — e só cai pro nome do equipamento quando não há OS (ex:
// "Oportunidade") ou nenhuma bateu por número. Entre vários resultados,
// fica com o mais recente (comparando a data da parada, formato AAAA-MM-DD,
// que ordena certo como string).
export function encontrarUltimoNaoFeito(
  servico: { numeroOS: string; equipamento: string },
  paradaAtualId: string | null | undefined,
  historico: HistoricoNaoFeitoItem[]
): HistoricoNaoFeitoItem | null {
  const candidatos = paradaAtualId ? historico.filter((h) => h.paradaId !== paradaAtualId) : historico;

  const numero = servico.numeroOS.trim();
  const porOS = numero && numero.toLowerCase() !== "oportunidade" ? candidatos.filter((h) => h.numeroOS.trim().toLowerCase() === numero.toLowerCase()) : [];

  const equipamento = normalizar(servico.equipamento);
  const porEquipamento = equipamento ? candidatos.filter((h) => normalizar(h.equipamento) === equipamento) : [];

  const combinados = porOS.length > 0 ? porOS : porEquipamento;
  if (combinados.length === 0) return null;

  return combinados.reduce((maisRecente, atual) => (atual.paradaData > maisRecente.paradaData ? atual : maisRecente));
}

export interface RecorrenciaNaoFeito {
  numeroOS: string;
  equipamento: string;
  ocorrencias: HistoricoNaoFeitoItem[];
}

// Agrupa o histórico por OS (ou por equipamento, quando não há OS) e devolve
// só os grupos que se repetem em MAIS DE UMA parada — não é "isso já não foi
// feito uma vez", é "isso já não foi feito de novo", que é o sinal que vale
// a pena destacar no dashboard sem precisar abrir relatório por relatório.
export function agruparRecorrencias(historico: HistoricoNaoFeitoItem[]): RecorrenciaNaoFeito[] {
  const grupos = new Map<string, HistoricoNaoFeitoItem[]>();
  for (const item of historico) {
    const numero = item.numeroOS.trim();
    const chave = numero && numero.toLowerCase() !== "oportunidade" ? `os:${numero.toLowerCase()}` : `eq:${normalizar(item.equipamento)}`;
    const grupo = grupos.get(chave) ?? [];
    grupo.push(item);
    grupos.set(chave, grupo);
  }

  const recorrencias: RecorrenciaNaoFeito[] = [];
  for (const ocorrencias of grupos.values()) {
    const paradasDistintas = new Set(ocorrencias.map((o) => o.paradaId));
    if (paradasDistintas.size < 2) continue;
    const maisRecente = ocorrencias.reduce((a, b) => (b.paradaData > a.paradaData ? b : a));
    recorrencias.push({ numeroOS: maisRecente.numeroOS, equipamento: maisRecente.equipamento, ocorrencias });
  }

  return recorrencias.sort((a, b) => b.ocorrencias.length - a.ocorrencias.length);
}
