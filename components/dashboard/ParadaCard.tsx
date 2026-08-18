"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, Calendar, Camera, Clock, Copy, Download, Factory, Pencil, Trash2, User } from "lucide-react";
import type { ParadaResumo } from "@/lib/types";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { MachineIllustration } from "@/components/ui/MachineIllustration";
import { formatDate } from "@/lib/utils";
import { useEditorMode } from "@/lib/useEditorMode";

interface ParadaCardProps {
  parada: ParadaResumo;
  index: number;
  onDelete?: () => void;
  onExport?: () => void;
  onClone?: () => void;
}

export function ParadaCard({ parada, index, onDelete, onExport, onClone }: ParadaCardProps) {
  const { isEditor } = useEditorMode();
  const showEditorControls = isEditor;

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-8% 0px" }}
      transition={{ duration: 0.5, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -6 }}
      className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04),0_1px_3px_rgba(16,24,40,0.06)] transition-shadow duration-300 hover:shadow-[0_12px_28px_rgba(16,24,40,0.12)]"
    >
      <div className="relative h-40 overflow-hidden bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700">
        {parada.fotosMaquina?.[0] ? (
          <motion.div className="absolute inset-0" whileHover={{ scale: 1.06 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
            <Image src={parada.fotosMaquina[0]} alt={parada.maquina} fill sizes="400px" className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-brand-950/50 via-transparent to-brand-950/10" />
          </motion.div>
        ) : (
          <motion.div
            className="absolute inset-0 flex items-center justify-center opacity-90"
            whileHover={{ scale: 1.06 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="h-40 w-40 -translate-y-2">
              <MachineIllustration variant={parada.imagem} className="h-full w-full" />
            </div>
          </motion.div>
        )}
        <div className="absolute left-4 top-4 flex items-center gap-2">
          <StatusBadge status={parada.status} className="bg-white/95 shadow-sm" />
        </div>
        {showEditorControls && (
          <div className="absolute right-4 top-4 flex items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
            <Link
              href={`/novo?edit=${parada.id}`}
              aria-label="Editar relatório"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-500 shadow-sm hover:bg-brand-100 hover:text-brand-600"
            >
              <Pencil size={13} />
            </Link>
            {onClone && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  onClone();
                }}
                aria-label="Clonar relatório"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-500 shadow-sm hover:bg-brand-100 hover:text-brand-600"
              >
                <Copy size={13} />
              </button>
            )}
            {onExport && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  onExport();
                }}
                aria-label="Exportar relatório"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-500 shadow-sm hover:bg-brand-100 hover:text-brand-600"
              >
                <Download size={13} />
              </button>
            )}
            {onDelete && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  onDelete();
                }}
                aria-label="Excluir relatório"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-500 shadow-sm hover:bg-danger-100 hover:text-danger-600"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-brand-950/60 to-transparent" />
      </div>

      <div className="p-6">
        <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand-600">
          <Factory size={13} />
          {parada.area}
        </div>
        <h3 className="text-lg font-bold leading-snug text-slate-900">{parada.nome}</h3>
        <p className="mt-0.5 text-sm font-medium text-slate-500">{parada.maquina}</p>

        <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-sm">
          <div className="flex items-center gap-2 text-slate-600">
            <Calendar size={15} className="text-slate-400" />
            {formatDate(parada.data)}
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <Clock size={15} className="text-slate-400" />
            {parada.duracaoRealizada}
          </div>
          <div className="col-span-2 flex items-center gap-2 text-slate-600">
            <User size={15} className="text-slate-400" />
            {parada.responsavel}
          </div>
        </div>

        <Link
          href={`/parada/${parada.id}`}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
        >
          Visualizar Relatório
          <ArrowUpRight size={16} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>

        {showEditorControls && (
          <Link
            href={`/parada/${parada.id}/fotos`}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-100"
          >
            <Camera size={16} />
            Captura Rápida (Celular)
          </Link>
        )}
      </div>
    </motion.div>
  );
}
