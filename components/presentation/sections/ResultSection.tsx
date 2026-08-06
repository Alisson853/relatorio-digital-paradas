"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Gauge, ShieldCheck, Timer, TrendingUp } from "lucide-react";
import type { Pendencia, ResultadoFinal } from "@/lib/types";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";
import { cn } from "@/lib/utils";

export function ResultSection({ resultado, pendencias }: { resultado: ResultadoFinal; pendencias: Pendencia[] }) {
  const sucesso = resultado.selo === "concluida";
  const ressalvas = resultado.selo === "ressalvas";

  const indicadores = [
    { label: "Tempo Planejado", value: resultado.tempoPlanejadoHoras, suffix: "h", icon: Timer },
    { label: "Tempo Realizado", value: resultado.tempoRealizadoHoras, suffix: "h", icon: Timer },
    { label: "Eficiência", value: resultado.eficiencia, suffix: "%", decimals: 1, icon: Gauge },
    { label: "Disponibilidade", value: resultado.disponibilidade, suffix: "%", decimals: 1, icon: TrendingUp },
    { label: "Pendências", value: resultado.pendenciasAbertas, suffix: "", icon: AlertTriangle },
  ];

  return (
    <section
      id="resultado"
      className="section-screen relative flex items-center overflow-hidden bg-gradient-to-br from-brand-950 via-brand-900 to-slate-950 px-6 py-24 sm:px-10"
    >
      <div className="pointer-events-none absolute -left-40 top-1/3 h-[520px] w-[520px] rounded-full bg-brand-500/15 blur-3xl" />

      <div className="relative mx-auto w-full max-w-5xl text-center">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-brand-200"
        >
          Resultado Final
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className={cn(
            "mx-auto mb-12 flex max-w-xl flex-col items-center gap-4 rounded-3xl border-2 px-8 py-10 shadow-2xl",
            sucesso ? "border-success-600/40 bg-success-600/10" : ressalvas ? "border-warning-600/40 bg-warning-600/10" : "border-brand-400/40 bg-brand-500/10"
          )}
        >
          <div
            className={cn(
              "flex h-20 w-20 items-center justify-center rounded-full",
              sucesso ? "bg-success-600" : ressalvas ? "bg-warning-600" : "bg-brand-500"
            )}
          >
            {sucesso ? <CheckCircle2 size={40} className="text-white" /> : <ShieldCheck size={40} className="text-white" />}
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {sucesso ? "PARADA CONCLUÍDA COM SUCESSO" : ressalvas ? "PARADA CONCLUÍDA COM RESSALVAS" : "PARADA EM ANDAMENTO"}
          </h2>
          <p className="max-w-md text-sm leading-relaxed text-brand-100">{resultado.resumo}</p>
        </motion.div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {indicadores.map((ind, i) => (
            <motion.div
              key={ind.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10% 0px" }}
              transition={{ duration: 0.5, delay: 0.3 + i * 0.06, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm"
            >
              <ind.icon size={18} className="mx-auto mb-2 text-brand-200" />
              <p className="text-2xl font-bold text-white">
                <AnimatedCounter value={ind.value} suffix={ind.suffix} decimals={ind.decimals ?? 0} />
              </p>
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-brand-300">{ind.label}</p>
            </motion.div>
          ))}
        </div>

        {pendencias.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-10% 0px" }}
            transition={{ duration: 0.5, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-6 text-left backdrop-blur-sm"
          >
            <p className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-warning-100">
              <AlertTriangle size={14} />
              O Que Não Foi Feito
            </p>
            <ul className="space-y-3">
              {pendencias.map((p) => (
                <li key={p.id} className="flex flex-col gap-0.5 border-b border-white/10 pb-3 last:border-0 last:pb-0 sm:flex-row sm:items-baseline sm:gap-3">
                  <span className="text-sm font-bold text-white sm:min-w-[40%]">{p.item}</span>
                  <span className="text-sm text-brand-200">{p.motivo}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-12 flex justify-center"
        >
          <Image src="/santher-logo-branco.png" alt="Santher" width={120} height={31} className="h-6 w-auto opacity-80" />
        </motion.div>
      </div>
    </section>
  );
}
