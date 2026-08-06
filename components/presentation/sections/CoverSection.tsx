"use client";

import Image from "next/image";
import { motion, type Variants } from "framer-motion";
import { Calendar, Clock, Timer, User } from "lucide-react";
import type { ParadaResumo } from "@/lib/types";
import { MachineIllustration } from "@/components/ui/MachineIllustration";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/utils";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: 0.15 * i, ease: [0.16, 1, 0.3, 1] as const },
  }),
};

export function CoverSection({ resumo }: { resumo: ParadaResumo }) {
  const infos = [
    { icon: Calendar, label: "Data da Parada", value: formatDate(resumo.data) },
    { icon: Timer, label: "Tempo Planejado", value: resumo.duracaoPlanejada },
    { icon: Clock, label: "Tempo Realizado", value: resumo.duracaoRealizada },
    { icon: User, label: "Responsável", value: resumo.responsavel },
  ];

  return (
    <section
      id="capa"
      className="section-screen relative flex items-center overflow-hidden bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800 px-6 py-24 sm:px-10"
    >
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
      </div>
      <div className="pointer-events-none absolute -right-32 -top-32 h-[520px] w-[520px] rounded-full bg-brand-500/20 blur-3xl" />

      <Image
        src="/santher-logo-branco.png"
        alt="Santher"
        width={130}
        height={33}
        className="absolute left-6 top-6 h-7 w-auto sm:left-10 sm:top-10 sm:h-8"
      />

      <div className="relative mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-16 lg:grid-cols-2">
        <div>
          <motion.div initial="hidden" animate="show" custom={0} variants={fadeUp} className="mb-6">
            <StatusBadge status={resumo.status} className="bg-white/10 text-white ring-1 ring-white/20 [&>span]:bg-current" />
          </motion.div>

          <motion.p
            initial="hidden"
            animate="show"
            custom={1}
            variants={fadeUp}
            className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-brand-300"
          >
            {resumo.area} · Relatório Digital
          </motion.p>

          <motion.h1
            initial="hidden"
            animate="show"
            custom={2}
            variants={fadeUp}
            className="text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl"
          >
            {resumo.nome}
          </motion.h1>

          <motion.p initial="hidden" animate="show" custom={3} variants={fadeUp} className="mt-5 text-lg font-medium text-brand-200">
            {resumo.maquina}
          </motion.p>

          <motion.div
            initial="hidden"
            animate="show"
            custom={4}
            variants={fadeUp}
            className="mt-12 grid grid-cols-2 gap-6 border-t border-white/10 pt-8 sm:grid-cols-4 lg:grid-cols-2"
          >
            {infos.map(({ icon: Icon, label, value }) => (
              <div key={label}>
                <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-brand-200">
                  <Icon size={17} />
                </div>
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-300">{label}</p>
                <p className="mt-0.5 text-base font-bold text-white">{value}</p>
              </div>
            ))}
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="relative mx-auto aspect-square w-full max-w-md"
        >
          <div className="absolute inset-0 rounded-full bg-white/5 blur-2xl" />
          <div className="relative flex h-full w-full items-center justify-center rounded-3xl border border-white/10 bg-white/5 p-12 backdrop-blur-sm">
            <MachineIllustration variant={resumo.imagem} className="h-full w-full" />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
