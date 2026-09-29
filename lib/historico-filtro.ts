import type { ParadaHistoricoItem } from "@/lib/actions/paradas";
import { codigoMaquina } from "@/lib/utils";

export interface FiltroHistorico {
  // Código da máquina (ex: "MP09"), ou "todas"/ausente para não filtrar.
  maquina?: string;
  // Datas no formato "AAAA-MM-DD" (mesmo formato salvo em resumo.data) —
  // comparação por string funciona porque ISO ordena igual a cronológico.
  dataDe?: string;
  dataAte?: string;
}

// Extraído de HistoricoCharts.tsx pra poder ser testado sem renderizar
// componente nenhum — é a regra que decide quais paradas entram no filtro
// por máquina/período do Histórico.
export function filtrarPorMaquinaEPeriodo(itens: ParadaHistoricoItem[], filtro: FiltroHistorico): ParadaHistoricoItem[] {
  return itens.filter((i) => {
    const bateMaquina = !filtro.maquina || filtro.maquina === "todas" || codigoMaquina(i.resumo.maquina) === filtro.maquina;
    const bateDe = !filtro.dataDe || i.resumo.data >= filtro.dataDe;
    const bateAte = !filtro.dataAte || i.resumo.data <= filtro.dataAte;
    return bateMaquina && bateDe && bateAte;
  });
}
