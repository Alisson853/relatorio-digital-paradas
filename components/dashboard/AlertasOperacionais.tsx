"use client";

import { useState } from "react";
import { AlertTriangle, Check, CircleAlert, Info, LoaderCircle } from "lucide-react";
import { resolverEventoOperacionalAction } from "@/lib/actions/paradas";

type Evento = {
  id: string;
  tipo: string;
  severidade: string;
  mensagem: string;
  paradaId: string | null;
  servicoId: string | null;
  criadoEm: Date;
};

export function AlertasOperacionais({ eventos: iniciais }: { eventos: Evento[] }) {
  const [eventos, setEventos] = useState(iniciais);
  const [resolvendo, setResolvendo] = useState<string | null>(null);

  async function resolver(id: string) {
    setResolvendo(id);
    const resultado = await resolverEventoOperacionalAction(id);
    if (resultado.ok) setEventos((atuais) => atuais.filter((evento) => evento.id !== id));
    setResolvendo(null);
  }

  if (eventos.length === 0) {
    return (
      <div className="mb-8 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-800">
        <Check size={18} /> Operação monitorada: não há alertas abertos no servidor.
      </div>
    );
  }

  return (
    <section className="mb-8 rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2 text-slate-900">
        <AlertTriangle size={19} className="text-amber-600" />
        <div><h2 className="text-sm font-extrabold">Atenção operacional</h2><p className="text-xs font-medium text-slate-500">Falhas e rotinas que precisam de conferência.</p></div>
      </div>
      <div className="space-y-2">
        {eventos.map((evento) => {
          const erro = evento.severidade === "erro";
          const Icone = erro ? CircleAlert : Info;
          return (
            <div key={evento.id} className={`flex items-center gap-3 rounded-xl border px-3 py-3 ${erro ? "border-red-200 bg-red-50" : "border-slate-200 bg-slate-50"}`}>
              <Icone size={17} className={erro ? "shrink-0 text-red-600" : "shrink-0 text-brand-600"} />
              <div className="min-w-0 flex-1"><p className="text-sm font-bold text-slate-800">{evento.mensagem}</p><p className="mt-0.5 text-[11px] font-medium text-slate-500">{new Date(evento.criadoEm).toLocaleString("pt-BR")}{evento.paradaId ? ` · Relatório ${evento.paradaId}` : ""}{evento.servicoId ? ` · OS ${evento.servicoId}` : ""}</p></div>
              <button type="button" onClick={() => resolver(evento.id)} disabled={resolvendo === evento.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50">
                {resolvendo === evento.id ? <LoaderCircle size={14} className="animate-spin" /> : "Resolvido"}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
