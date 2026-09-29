"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface CollapsibleSectionProps {
  numero: number;
  titulo: string;
  descricao: string;
  badge?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function CollapsibleSection({ numero, titulo, descricao, badge, defaultOpen = false, children }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  // Mesma faixa de cabeçalho tingida do FormSection (app/novo/page.tsx) —
  // as duas variantes de seção (fixa e recolhível) precisam ler como o
  // mesmo sistema, não dois estilos concorrendo na mesma tela.
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-start justify-between gap-3 bg-slate-50/70 px-6 py-5 text-left transition-colors hover:bg-slate-100/70 sm:px-8",
          open && "border-b border-slate-100"
        )}
      >
        <div className="flex items-start gap-3">
          <span className="label-tecnico flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
            {String(numero).padStart(2, "0")}
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">{titulo}</h2>
              {badge && (
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  {badge}
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500">{descricao}</p>
          </div>
        </div>
        <ChevronDown size={18} className={cn("mt-1 flex-none text-slate-400 transition-transform", open && "rotate-180")} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="p-6 sm:p-8">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
