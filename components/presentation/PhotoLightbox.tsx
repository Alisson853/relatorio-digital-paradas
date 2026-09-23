"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export interface LightboxPhoto {
  id: string;
  url: string;
  label: string;
}

interface Props {
  photos: LightboxPhoto[];
  activeIndex: number | null;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

// Extraído da galeria (GallerySection), que já tinha exatamente esse
// visualizador — em vez de reescrever a mesma mecânica de portal/teclado/
// navegação em cada lugar que mostra foto (galeria, e agora o painel
// Antes/Durante/Depois de cada serviço), os dois passam a usar isto.
export function PhotoLightbox({ photos, activeIndex, onClose, onNavigate }: Props) {
  const next = () => activeIndex !== null && onNavigate((activeIndex + 1) % photos.length);
  const prev = () => activeIndex !== null && onNavigate((activeIndex - 1 + photos.length) % photos.length);

  useEffect(() => {
    if (activeIndex === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, photos.length]);

  const active = activeIndex !== null ? photos[activeIndex] : null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 p-6 backdrop-blur-sm"
          onClick={onClose}
        >
          <button onClick={onClose} className="absolute right-6 top-6 rounded-full bg-white/10 p-2.5 text-white hover:bg-white/20">
            <X size={20} />
          </button>
          {photos.length > 1 && (
            <>
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
            </>
          )}

          <motion.div
            key={active.id}
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative aspect-[4/3] w-full max-w-3xl overflow-hidden rounded-2xl bg-slate-900"
          >
            <Image src={active.url} alt={active.label} fill sizes="800px" className="object-contain" loading="eager" unoptimized={active.url.startsWith("data:")} />
          </motion.div>
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-5 py-2 text-center text-sm font-semibold text-white">
            {active.label}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
