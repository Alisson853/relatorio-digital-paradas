// Histórico de serviços marcados "não será feito" em paradas passadas —
// compartilhado entre a Captura Rápida (celular, em campo) e o formulário
// /novo (desktop, ao montar/importar o relatório), pra alertar quando a
// mesma OS ou o mesmo equipamento reaparece: da última vez não foi feito,
// e por quê.
export interface HistoricoNaoFeitoItem {
  paradaId: string;
  paradaNome: string;
  paradaData: string;
  numeroOS: string;
  equipamento: string;
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
