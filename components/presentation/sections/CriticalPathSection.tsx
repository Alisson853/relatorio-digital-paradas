"use client";

import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import type { CaminhoCriticoItem } from "@/lib/types";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { cn } from "@/lib/utils";

function formatDiff(min: number): string {
  if (min === 0) return "No prazo";
  return `+${min} min`;
}

export function CriticalPathSection({ itens }: { itens: CaminhoCriticoItem[] }) {
  const atrasados = itens.filter((i) => i.diferencaMin > 60).length;

  return (
    <section id="caminho-critico" className="section-screen flex items-center bg-white px-6 py-24 sm:px-10">
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading
            eyebrow="Cronograma Crítico"
            title="Caminho Crítico"
            description="Atividades que determinam o prazo final da parada — desvios são destacados automaticamente."
          />
          {atrasados > 0 && (
            <div className="mb-10 flex items-center gap-2 rounded-full bg-danger-100 px-4 py-2 text-xs font-bold text-danger-600">
              <AlertTriangle size={14} />
              {atrasados} atividade(s) com atraso relevante
            </div>
          )}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10% 0px" }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm"
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead>
                <tr className="bg-slate-900 text-xs font-bold uppercase tracking-wide text-slate-300">
                  <th className="px-5 py-3.5">Serviço</th>
                  <th className="px-4 py-3.5">Início Planej.</th>
                  <th className="px-4 py-3.5">Fim Planej.</th>
                  <th className="px-4 py-3.5">Início Real</th>
                  <th className="px-4 py-3.5">Fim Real</th>
                  <th className="px-4 py-3.5">Diferença</th>
                  <th className="px-4 py-3.5">Responsável</th>
                  <th className="px-4 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {itens.map((item) => (
                  <tr
                    key={item.id}
                    className={cn(
                      "transition-colors hover:bg-slate-50",
                      item.diferencaMin > 60 && "bg-danger-100/40"
                    )}
                  >
                    <td className="px-5 py-3.5 font-semibold text-slate-800">{item.servico}</td>
                    <td className="px-4 py-3.5 font-mono text-slate-500">{item.inicioPlanejado}</td>
                    <td className="px-4 py-3.5 font-mono text-slate-500">{item.fimPlanejado}</td>
                    <td className="px-4 py-3.5 font-mono text-slate-500">{item.inicioReal}</td>
                    <td className="px-4 py-3.5 font-mono text-slate-500">{item.fimReal}</td>
                    <td
                      className={cn(
                        "px-4 py-3.5 font-bold",
                        item.diferencaMin > 60 ? "text-danger-600" : item.diferencaMin > 0 ? "text-warning-600" : "text-success-600"
                      )}
                    >
                      {formatDiff(item.diferencaMin)}
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">{item.responsavel}</td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={item.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
