"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import type { FotoGaleria } from "@/lib/types";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { PhotoLightbox } from "@/components/presentation/PhotoLightbox";
import { cn } from "@/lib/utils";

type Filtro = "todas" | "antes" | "durante" | "depois";

export function GallerySection({ fotos }: { fotos: FotoGaleria[] }) {
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const filtradas = fotos.filter((f) => filtro === "todas" || f.categoria === filtro);

  const contagemPorServico = fotos.reduce<Record<string, number>>((acc, f) => {
    acc[f.servico] = (acc[f.servico] ?? 0) + 1;
    return acc;
  }, {});

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
                alt={foto.servico}
                fill
                sizes="200px"
                className="object-cover transition-transform duration-500 group-hover:scale-110"
                loading="eager"
                unoptimized={foto.url.startsWith("data:")}
              />
              {/* A legenda so aparecia no hover. Em celular nao existe hover:
                  a foto ficava sem identificacao nenhuma, e quem abre o
                  relatorio no aparelho ve uma parede de imagens sem saber a
                  qual servico cada uma pertence. No estreito ela fica sempre
                  visivel; do lg pra cima volta a surgir no hover, que ali
                  funciona e deixa a grade mais limpa.

                  E line-clamp-2 no lugar de truncate porque o titulo do servico
                  precisa de 345px numa faixa de 195: numa linha so, "Manutencao
                  em 001-0126 - Rol…" nao diz de que equipamento se trata. */}
              <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/70 via-black/10 to-black/0 p-2.5 transition-opacity lg:opacity-0 lg:group-hover:opacity-100">
                <p className="line-clamp-2 text-[11px] font-semibold leading-snug text-white">{foto.servico}</p>
              </div>
              {contagemPorServico[foto.servico] > 1 && (
                <span
                  className={cn(
                    "absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase text-white shadow",
                    foto.categoria === "antes" ? "bg-slate-800/80" : foto.categoria === "durante" ? "bg-warning-600/90" : "bg-brand-600/90"
                  )}
                >
                  {foto.categoria}
                </span>
              )}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                <Search size={20} className="text-white drop-shadow" />
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      <PhotoLightbox
        photos={filtradas.map((f) => ({ id: f.id, url: f.url, label: f.servico }))}
        activeIndex={activeIndex}
        onClose={() => setActiveIndex(null)}
        onNavigate={setActiveIndex}
      />
    </section>
  );
}
