"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Calendar, Camera, Clock, Copy, Download, Factory, Pencil, Trash2, User } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ParadaResumo } from "@/lib/types";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { MachineIllustration } from "@/components/ui/MachineIllustration";
import { cn, formatDate } from "@/lib/utils";
import { useEditorMode } from "@/lib/useEditorMode";

interface ParadaCardProps {
  parada: ParadaResumo;
  index: number;
  onDelete?: () => void;
  onExport?: () => void;
  onClone?: () => void;
}

const FOCO = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600";

function IconAction({ icon: Icon, label, onClick, href, danger = false }: { icon: LucideIcon; label: string; onClick?: () => void; href?: string; danger?: boolean }) {
  const classes = cn("flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-slate-600 shadow-sm transition-colors", FOCO, danger ? "hover:bg-danger-100 hover:text-danger-600" : "hover:bg-brand-100 hover:text-brand-600");
  if (href) return <Link href={href} aria-label={label} title={label} className={classes}><Icon size={16} aria-hidden="true" /></Link>;
  return <button type="button" onClick={onClick} aria-label={label} title={label} className={classes}><Icon size={16} aria-hidden="true" /></button>;
}

export function ParadaCard({ parada, index, onDelete, onExport, onClone }: ParadaCardProps) {
  const { isEditor } = useEditorMode();
  const reduzirMovimento = useReducedMotion();
  const emAndamento = parada.status === "em_andamento";

  return (
    <motion.article
      initial={reduzirMovimento ? false : { opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-8% 0px" }}
      transition={{ duration: 0.5, delay: reduzirMovimento ? 0 : index * 0.05, ease: [0.16, 1, 0.3, 1] }}
      whileHover={reduzirMovimento ? undefined : { y: -6 }}
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04),0_1px_3px_rgba(16,24,40,0.06)] transition-shadow duration-300 hover:shadow-[0_12px_28px_rgba(16,24,40,0.12)]"
    >
      <div className="relative h-40 overflow-hidden bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700">
        {parada.fotosMaquina?.[0] ? (
          <motion.div className="absolute inset-0" whileHover={reduzirMovimento ? undefined : { scale: 1.06 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
            <Image src={parada.fotosMaquina[0]} alt={`Foto da máquina ${parada.maquina}`} fill sizes="(min-width: 1024px) 380px, (min-width: 640px) 45vw, 100vw" className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-brand-950/50 via-transparent to-brand-950/10" />
          </motion.div>
        ) : (
          <motion.div
            className="absolute inset-0 flex items-center justify-center opacity-90"
            whileHover={reduzirMovimento ? undefined : { scale: 1.06 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            aria-hidden="true"
          >
            <div className="h-40 w-40 -translate-y-2">
              <MachineIllustration variant={parada.imagem} className="h-full w-full" />
            </div>
          </motion.div>
        )}
        <div className="absolute left-4 top-4 flex items-center gap-2">
          <StatusBadge status={parada.status} className="bg-white/95 shadow-sm" />
        </div>
        {isEditor && (
          <div role="group" aria-label="Ações do relatório" className="absolute right-3 top-3 flex items-center gap-1.5 transition-opacity [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100">
            <IconAction icon={Pencil} label="Editar relatório" href={`/novo?edit=${parada.id}`} />
            {onClone && <IconAction icon={Copy} label="Clonar relatório" onClick={onClone} />}
            {onExport && <IconAction icon={Download} label="Exportar relatório" onClick={onExport} />}
            {onDelete && <IconAction icon={Trash2} label="Excluir relatório" onClick={onDelete} danger />}
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-brand-950/60 to-transparent" />
      </div>

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand-600">
          <Factory size={13} aria-hidden="true" />
          {parada.area}
        </div>
        <h3 className="text-lg font-bold leading-snug text-slate-900">{parada.nome}</h3>
        <p className="mt-0.5 text-sm font-medium text-slate-600">{parada.maquina}</p>

        <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-sm">
          <div className="flex items-center gap-2 text-slate-600">
            <Calendar size={15} className="flex-none text-slate-500" aria-hidden="true" />
            <dt className="sr-only">Data</dt><dd>{formatDate(parada.data)}</dd>
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <Clock size={15} className="flex-none text-slate-500" aria-hidden="true" />
            <dt className="font-bold text-slate-700">Real:</dt><dd>{parada.duracaoRealizada}</dd>
          </div>
          <div className="col-span-2 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-slate-50 px-2.5 py-2 text-xs text-slate-600">
            <Clock size={14} className="flex-none text-brand-600" aria-hidden="true" />
            <dt className="sr-only">Duração planejada</dt><dd>Planejado: <b>{parada.duracaoPlanejada}</b></dd>
            <span className={cn("ml-auto font-bold", emAndamento ? "text-brand-700" : "text-slate-700")}>{emAndamento ? "Em execução" : "Relatório finalizado"}</span>
          </div>
          <div className="col-span-2 flex items-center gap-2 text-slate-600">
            <User size={15} className="flex-none text-slate-500" aria-hidden="true" />
            <dt className="sr-only">Responsável</dt><dd className="min-w-0 truncate">{parada.responsavel || "Sem responsável informado"}</dd>
          </div>
        </dl>

        <div className="mt-auto pt-6">
          <Link href={`/parada/${parada.id}`} aria-label={`Visualizar relatório: ${parada.nome}`} className={cn("flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700", FOCO)}>
            Visualizar Relatório
            <ArrowUpRight size={16} aria-hidden="true" className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
          {isEditor && (
            <Link href={`/parada/${parada.id}/fotos`} className={cn("mt-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-100", FOCO)}>
              <Camera size={16} aria-hidden="true" />
              Captura Rápida (Celular)
            </Link>
          )}
        </div>
      </div>
    </motion.article>
  );
}
