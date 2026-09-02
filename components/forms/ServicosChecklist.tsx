"use client";

import { CheckCircle2, Circle } from "lucide-react";
import type { ServicoRow } from "./ServicoRowEditor";
import { cn, pareceNomeDePessoa } from "@/lib/utils";

interface Props {
  servicos: ServicoRow[];
  onToggle: (id: string, concluido: boolean) => void;
}

// Marcar concluído/pendente em cada OS abrindo o card completo (fotos, motivo,
// equipe...) é lento pra uma lista importada com dezenas de linhas — este
// checklist deixa só OS + equipamento + um toque, pra revisar tudo rápido.
export function ServicosChecklist({ servicos, onToggle }: Props) {
  if (servicos.length === 0) return null;

  const concluidas = servicos.filter((s) => s.status === "concluido").length;

  return (
    <div className="mb-5 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div>
          <p className="text-sm font-bold text-slate-800">Checklist Rápido</p>
          <p className="text-xs text-slate-500">Toque para marcar concluído — sem abrir o card de cada OS.</p>
        </div>
        <span className="flex-none rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
          {concluidas}/{servicos.length}
        </span>
      </div>
      <div className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
        {servicos.map((s) => {
          const concluido = s.status === "concluido";
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onToggle(s.id, !concluido)}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-slate-50"
            >
              {concluido ? <CheckCircle2 size={18} className="flex-none text-success-600" /> : <Circle size={18} className="flex-none text-slate-300" />}
              <span className="w-16 flex-none truncate font-mono text-xs font-bold text-brand-600">
                {s.numeroOS === "Oportunidade" ? "—" : s.numeroOS || "—"}
              </span>
              <span className="min-w-0 flex-1">
                <span className={cn("block truncate text-sm", concluido ? "text-slate-400 line-through" : "text-slate-700")}>
                  {s.equipamento || "Sem nome"}
                </span>
                {/* Nome de quem executa, pra revisar o checklist já sabendo com
                    quem falar em cada OS pendente, sem precisar abrir o card. */}
                {s.responsavel && pareceNomeDePessoa(s.responsavel) && (
                  <span className="block truncate text-xs font-semibold text-brand-600">{s.responsavel}</span>
                )}
              </span>
              <span
                className={cn(
                  "flex-none rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                  concluido ? "bg-success-100 text-success-700" : "bg-slate-100 text-slate-500"
                )}
              >
                {concluido ? "Concluído" : "Pendente"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
