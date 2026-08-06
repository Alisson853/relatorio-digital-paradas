"use client";

import { useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Clock, MapPin, Users2 } from "lucide-react";
import type { Servico } from "@/lib/types";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { cn } from "@/lib/utils";

function MetaField({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 break-words text-sm font-semibold leading-snug text-slate-800">{value}</p>
    </div>
  );
}

function ServiceSlide({ servico }: { servico: Servico }) {
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.15fr_1fr] lg:gap-10">
      <div>
        <div className="mb-4 flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-brand-600">
            Serviços Executados
          </span>
          <StatusBadge status={servico.status} />
        </div>

        <h3 className="break-words text-xl font-bold uppercase leading-tight tracking-tight text-slate-900 sm:text-2xl lg:text-3xl">
          {servico.titulo}
        </h3>

        <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-4">
          <MetaField label="OS" value={servico.numeroOS} />
          <MetaField label="Tempo Total" value={servico.tempoGasto} />
          <MetaField label="Equipamento" value={servico.equipamento} className="col-span-2 sm:col-span-4" />
          <div className="col-span-2 flex items-start gap-1.5 sm:col-span-2">
            <MapPin size={13} className="mt-4 flex-none text-slate-400" />
            <MetaField label="Local" value={servico.area} />
          </div>
          <div className="col-span-2 flex items-start gap-1.5 sm:col-span-2">
            <Users2 size={13} className="mt-4 flex-none text-slate-400" />
            <MetaField label="Área Responsável" value={`${servico.equipe} · ${servico.responsavel}`} />
          </div>
          <div className="col-span-2 flex items-start gap-1.5 sm:col-span-4">
            <Clock size={13} className="mt-4 flex-none text-slate-400" />
            <MetaField label="Início — Término" value={`${servico.horaInicio} — ${servico.horaFim}`} />
          </div>
        </div>

        <div className="mt-6 space-y-4 text-sm">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-brand-600">Problema Identificado</p>
            <p className="mt-1 leading-relaxed text-slate-600">{servico.problemaIdentificado}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-brand-600">O Que Foi Feito</p>
            <p className="mt-1 leading-relaxed text-slate-600">{servico.servicoExecutado}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-brand-600">Resultado</p>
            <p className="mt-1 leading-relaxed text-slate-600">{servico.resultado}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border-2 border-brand-100 bg-brand-50/40 p-4 sm:p-6">
        <div className="grid w-full grid-cols-2 gap-3">
          <div>
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl border-2 border-white shadow-md">
              <Image src={servico.fotoAntes} alt={`Antes — ${servico.equipamento}`} fill sizes="320px" className="object-cover" />
            </div>
            <p className="mt-2 text-center text-xs font-bold uppercase tracking-wide text-slate-500">Antes</p>
          </div>
          <div>
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl border-2 border-white shadow-md">
              <Image src={servico.fotoDepois} alt={`Depois — ${servico.equipamento}`} fill sizes="320px" className="object-cover" />
            </div>
            <p className="mt-2 text-center text-xs font-bold uppercase tracking-wide text-slate-500">Depois</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ServicesSection({ servicos }: { servicos: Servico[] }) {
  const [index, setIndex] = useState(0);
  const total = servicos.length;
  const atual = servicos[index];

  const goPrev = () => setIndex((i) => Math.max(0, i - 1));
  const goNext = () => setIndex((i) => Math.min(total - 1, i + 1));

  return (
    <section id="servicos" className="section-screen flex items-center bg-slate-50 px-6 py-24 sm:px-10">
      <div className="mx-auto w-full max-w-6xl">
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_4px_24px_rgba(16,24,40,0.06)] sm:p-10">
          <div className="absolute inset-y-0 left-0 w-1.5 bg-brand-600" />

          <AnimatePresence mode="wait">
            <motion.div
              key={atual.id}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              <ServiceSlide servico={atual} />
            </motion.div>
          </AnimatePresence>

          <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-5">
            <p className="text-xs font-semibold text-slate-400">Relatório da Parada de Manutenção</p>
            <div className="flex items-center gap-3">
              <button
                onClick={goPrev}
                disabled={index === 0}
                aria-label="Serviço anterior"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-30"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-bold text-slate-700">
                {index + 1}/{total}
              </span>
              <button
                onClick={goNext}
                disabled={index === total - 1}
                aria-label="Próximo serviço"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-white transition-colors hover:bg-brand-700 disabled:opacity-30"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
