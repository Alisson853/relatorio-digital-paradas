"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import type { FotoGaleria } from "@/lib/types";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { cn } from "@/lib/utils";

type Filtro = "todas" | "antes" | "durante" | "depois";

export function GallerySection({ fotos }: { fotos: FotoGaleria[] }) {
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const filtradas = fotos.filter((f) => filtro === "todas" || f.categoria === filtro);

  const close = () => setActiveIndex(null);
  const next = () => setActiveIndex((i) => (i === null ? null : (i + 1) % filtradas.length));
  const prev = () => setActiveIndex((i) => (i === null ? null : (i - 1 + filtradas.length) % filtradas.length));

  useEffect(() => {
    if (activeIndex === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, filtradas.length]);

  const active = activeIndex !== null ? filtradas[activeIndex] : null;

  return (
    <section id="fotos" className="section-screen flex items-center bg-white px-6 py-24 sm:px-10">
      <div className="mx-auto w-full max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading
            eyebrow="Registro Fotográfico"
            title="Galeria Antes, Durante & Depois"
            description="Evidências visuais dos serviços executados durante a parada."
          />
          <div className="mb-10 flex gap-1.5 rounded-full border border-slate-200 bg-slate-50 p-1">
            {(["todas", "antes", "durante", "depois"] as Filtro[]).map((f) => (
              <button
                key={f}
                onClick={() => setFiltro(f)}
                className={cn(
                  "rounded-full px-4 py-1.5 text-xs font-bold capitalize transition-colors",
                  filtro === f ? "bg-brand-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-800"
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {filtradas.map((foto, i) => (
            <motion.button
              key={foto.id}
              layout
              initial={{ opacity: 0, scale: 0.92 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-5% 0px" }}
              transition={{ duration: 0.35, delay: Math.min(i * 0.02, 0.3) }}
              onClick={() => setActiveIndex(i)}
              className="group relative aspect-square overflow-hidden rounded-xl bg-slate-100"
            >
              <Image
                src={foto.url}
                alt={`${foto.categoria} — ${foto.servico}`}
                fill
                sizes="200px"
                className="object-cover transition-transform duration-500 group-hover:scale-110"
                loading="eager"
                unoptimized={foto.url.startsWith("data:")}
              />
              <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 via-black/0 to-black/0 p-2.5 opacity-0 transition-opacity group-hover:opacity-100">
                <p className="truncate text-[11px] font-semibold text-white">{foto.servico}</p>
              </div>
              <span
                className={cn(
                  "absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase text-white shadow",
                  foto.categoria === "antes" ? "bg-slate-800/80" : foto.categoria === "durante" ? "bg-warning-600/90" : "bg-brand-600/90"
                )}
              >
                {foto.categoria}
              </span>
              <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                <Search size={20} className="text-white drop-shadow" />
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {active && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 p-6 backdrop-blur-sm"
                onClick={close}
              >
                <button onClick={close} className="absolute right-6 top-6 rounded-full bg-white/10 p-2.5 text-white hover:bg-white/20">
                  <X size={20} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    prev();
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white hover:bg-white/20 sm:left-8"
                >
                  <ChevronLeft size={22} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    next();
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white hover:bg-white/20 sm:right-8"
                >
                  <ChevronRight size={22} />
                </button>

                <motion.div
                  key={active.id}
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  onClick={(e) => e.stopPropagation()}
                  className="relative aspect-[4/3] w-full max-w-3xl overflow-hidden rounded-2xl bg-slate-900"
                >
                  <Image
                    src={active.url}
                    alt={active.servico}
                    fill
                    sizes="800px"
                    className="object-contain"
                    loading="eager"
                    unoptimized={active.url.startsWith("data:")}
                  />
                </motion.div>
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-5 py-2 text-center text-sm font-semibold text-white">
                  {active.servico} · <span className="capitalize text-brand-200">{active.categoria}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </section>
  );
}
