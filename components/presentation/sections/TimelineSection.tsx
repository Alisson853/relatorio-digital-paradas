"use client";

import { motion } from "framer-motion";
import {
  CheckCircle2,
  Flag,
  Lock,
  LucideIcon,
  Play,
  Search,
  Unlock,
  Wrench,
  ArrowRightLeft,
} from "lucide-react";
import type { TimelineEvento } from "@/lib/types";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { cn, statusDotClasses } from "@/lib/utils";

const ICONS: Record<TimelineEvento["icone"], LucideIcon> = {
  flag: Flag,
  lock: Lock,
  wrench: Wrench,
  swap: ArrowRightLeft,
  search: Search,
  "check-circle": CheckCircle2,
  play: Play,
  unlock: Unlock,
};

export function TimelineSection({ timeline }: { timeline: TimelineEvento[] }) {
  return (
    <section id="timeline" className="section-screen flex items-center bg-white px-6 py-24 sm:px-10">
      <div className="mx-auto w-full max-w-6xl">
        <SectionHeading
          eyebrow="Cronologia da Parada"
          title="Linha do Tempo"
          description="Sequência completa das etapas executadas, do bloqueio à liberação do equipamento."
        />

        <div className="relative pl-2">
          <div className="absolute bottom-0 left-[27px] top-0 w-px bg-slate-200" aria-hidden />
          <ol className="space-y-2">
            {timeline.map((evento, i) => {
              const Icon = ICONS[evento.icone];
              return (
                <motion.li
                  key={evento.id}
                  initial={{ opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-10% 0px" }}
                  transition={{ duration: 0.4, delay: i * 0.035, ease: [0.16, 1, 0.3, 1] }}
                  className="group relative flex gap-5 rounded-xl px-3 py-3 transition-colors hover:bg-slate-50"
                >
                  <div className="relative z-10 flex h-14 w-14 flex-none items-center justify-center rounded-full border-2 border-white bg-brand-50 text-brand-600 shadow-sm ring-1 ring-slate-200">
                    <Icon size={20} />
                  </div>
                  <div className="flex flex-1 flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4 pt-1.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={cn("h-1.5 w-1.5 rounded-full", statusDotClasses(evento.status))} />
                        <p className="font-mono text-sm font-bold text-brand-600">{evento.horario}</p>
                      </div>
                      <h3 className="mt-1 text-base font-bold text-slate-900">{evento.titulo}</h3>
                      <p className="mt-1 max-w-xl text-sm leading-relaxed text-slate-500">{evento.descricao}</p>
                      <p className="mt-1.5 text-xs font-semibold text-slate-400">Responsável: {evento.responsavel}</p>
                    </div>
                    <StatusBadge status={evento.status} />
                  </div>
                </motion.li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
