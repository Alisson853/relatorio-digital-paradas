"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { listHistoricoNaoFeito } from "@/lib/actions/paradas";
import { agruparRecorrencias, type RecorrenciaNaoFeito } from "@/lib/historico-nao-feito";
import { useEditorMode } from "@/lib/useEditorMode";

// Só aparece pro editor (mesma senha que dá acesso ao checklist de
// pendências) e só quando existe alguma recorrência de verdade — mesma OS ou
// equipamento marcado "não será feito" em MAIS DE UMA parada. Uma ocorrência
// isolada já aparece no Checklist de Pendências; aqui o ponto é destacar sem
// precisar abrir relatório por relatório o que está travando de novo.
export function RecorrenciasNaoFeito() {
  const { ready, isEditor } = useEditorMode();
  const [recorrencias, setRecorrencias] = useState<RecorrenciaNaoFeito[] | null>(null);

  useEffect(() => {
    if (!isEditor) return;
    listHistoricoNaoFeito().then((historico) => setRecorrencias(agruparRecorrencias(historico)));
  }, [isEditor]);

  if (!ready || !isEditor || !recorrencias || recorrencias.length === 0) return null;

  return (
    <Link
      href="/pendencias"
      className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-danger-200 bg-danger-50 px-5 py-4 transition-colors hover:bg-danger-100"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle size={18} className="mt-0.5 flex-none text-danger-600" />
        <div>
          <p className="text-sm font-bold text-danger-800">
            {recorrencias.length} serviço{recorrencias.length > 1 ? "s" : ""} recorrente{recorrencias.length > 1 ? "s" : ""} sem fazer
          </p>
          <p className="mt-0.5 text-xs text-danger-700">
            {recorrencias
              .slice(0, 3)
              .map((r) => `${r.numeroOS !== "Oportunidade" ? `OS ${r.numeroOS}` : r.equipamento} (${r.ocorrencias.length}x)`)
              .join(" · ")}
            {recorrencias.length > 3 ? ` e mais ${recorrencias.length - 3}` : ""}
          </p>
        </div>
      </div>
      <span className="flex items-center gap-1 text-xs font-bold text-danger-700">
        Ver checklist
        <ArrowRight size={14} />
      </span>
    </Link>
  );
}
