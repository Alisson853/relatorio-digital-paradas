"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, ClipboardList, Loader2 } from "lucide-react";
import { listChecklistPendencias, type PendenciaChecklistItem } from "@/lib/actions/paradas";
import { MOTIVOS_NAO_FEITO, type MotivoNaoFeitoCategoria } from "@/lib/types";
import { useEditorMode } from "@/lib/useEditorMode";
import { EditorPasswordForm } from "@/components/shared/EditorPasswordForm";
import { cn } from "@/lib/utils";

const BADGE_STYLES: Record<string, string> = {
  "Foto Antes": "bg-warning-100 text-warning-600 border-transparent",
  "Foto Depois": "bg-warning-100 text-warning-600 border-transparent",
  "Status pendente": "bg-danger-100 text-danger-600 border-transparent",
  "Não será feito": "bg-danger-100 text-danger-700 border-transparent",
};

export function PendenciasChecklist() {
  const { ready, isEditor, unlock } = useEditorMode();
  const [itens, setItens] = useState<PendenciaChecklistItem[] | null>(null);
  // "Todas" (null) por padrão — o filtro só serve pra quando alguém (ex:
  // compras) quer ver só um motivo específico, tipo só "Falta de Material",
  // sem precisar catar entre fotos faltando e status pendente no meio.
  const [filtroCategoria, setFiltroCategoria] = useState<MotivoNaoFeitoCategoria | null>(null);

  useEffect(() => {
    if (!isEditor) return;
    listChecklistPendencias().then(setItens);
  }, [isEditor]);

  if (!ready) return null;

  if (!isEditor) {
    return (
      <div className="mx-auto max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <EditorPasswordForm onUnlock={unlock} onSuccess={() => {}} titulo="Acesso Restrito" descricao="Digite a senha para ver as pendências de todos os relatórios." />
      </div>
    );
  }

  if (itens === null) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-sm font-medium text-slate-400">
        <Loader2 size={16} className="animate-spin" />
        Carregando pendências...
      </div>
    );
  }

  // Só vira chip a categoria que realmente aparece em alguma pendência —
  // senão a lista de filtro fica cheia de opção que nunca vai achar nada.
  const categoriasComDados = MOTIVOS_NAO_FEITO.filter((cat) => itens.some((item) => item.naoFeitoCategoria === cat));
  const itensFiltrados = filtroCategoria ? itens.filter((item) => item.naoFeitoCategoria === filtroCategoria) : itens;

  const porParada = new Map<string, { paradaNome: string; itens: PendenciaChecklistItem[] }>();
  itensFiltrados.forEach((item) => {
    const grupo = porParada.get(item.paradaId) ?? { paradaNome: item.paradaNome, itens: [] };
    grupo.itens.push(item);
    porParada.set(item.paradaId, grupo);
  });
  const grupos = Array.from(porParada.entries());

  const filtro = categoriasComDados.length > 0 && (
    <div className="mb-6 flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-xs font-bold text-slate-400">Motivo:</span>
      <button
        type="button"
        onClick={() => setFiltroCategoria(null)}
        className={cn(
          "rounded-full border px-3 py-1 text-[11px] font-bold transition-colors",
          filtroCategoria === null ? "border-brand-600 bg-brand-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
        )}
      >
        Todas
      </button>
      {categoriasComDados.map((cat) => (
        <button
          key={cat}
          type="button"
          onClick={() => setFiltroCategoria(cat)}
          className={cn(
            "rounded-full border px-3 py-1 text-[11px] font-bold transition-colors",
            filtroCategoria === cat ? "border-danger-600 bg-danger-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          )}
        >
          {cat}
        </button>
      ))}
    </div>
  );

  if (grupos.length === 0) {
    return (
      <div>
        {filtro}
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 bg-white py-20 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success-100 text-success-600">
            <CheckCircle2 size={22} />
          </div>
          <p className="text-sm font-medium text-slate-500">
            {filtroCategoria ? `Nenhuma pendência com o motivo "${filtroCategoria}".` : "Nenhuma pendência encontrada. Todos os relatórios estão completos."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {filtro}
      {grupos.map(([paradaId, grupo]) => (
        <div key={paradaId} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <ClipboardList size={16} className="text-brand-500" />
              <h3 className="text-sm font-bold text-slate-900">{grupo.paradaNome}</h3>
              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                {grupo.itens.length} pendência{grupo.itens.length > 1 ? "s" : ""}
              </span>
            </div>
            <Link href={`/novo?edit=${paradaId}`} className="text-xs font-bold text-brand-600 hover:text-brand-700">
              Editar relatório →
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {grupo.itens.map((item) => (
              <div key={item.servicoId} className="px-5 py-3.5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">
                      {item.numeroOS !== "Oportunidade" ? `OS ${item.numeroOS} — ` : ""}
                      {item.titulo || item.equipamento}
                    </p>
                    <p className="text-xs text-slate-400">
                      {item.equipamento} · {item.equipe}
                      {item.responsavel ? ` · ${item.responsavel}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {item.faltando.map((f) => (
                      <span
                        key={f}
                        className={cn(
                          "flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold",
                          BADGE_STYLES[f] ?? "border-slate-200 bg-slate-50 text-slate-600"
                        )}
                      >
                        <AlertTriangle size={11} />
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
                {item.naoFeitoCategoria && (
                  <p className="mt-2 rounded-lg bg-danger-50 px-3 py-2 text-xs text-danger-700">
                    <span className="font-bold">Motivo: </span>
                    {item.naoFeitoCategoria}
                    {item.justificativaNaoFeito && ` — ${item.justificativaNaoFeito}`}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
