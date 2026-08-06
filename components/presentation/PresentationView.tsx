"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { ParadaCompleta } from "@/lib/types";
import { SECTIONS } from "@/lib/sections";
import { cn } from "@/lib/utils";
import { Sidebar } from "./Sidebar";
import { FitToScreen } from "./FitToScreen";
import { CoverSection } from "./sections/CoverSection";
import { SummarySection } from "./sections/SummarySection";
import { TimelineSection } from "./sections/TimelineSection";
import { ServicesSection } from "./sections/ServicesSection";
import { GallerySection } from "./sections/GallerySection";
import { ChartsSection } from "./sections/ChartsSection";
import { CriticalPathSection } from "./sections/CriticalPathSection";
import { ResultSection } from "./sections/ResultSection";

// Mesma cor de fundo de cada seção — evita "bordas" visíveis quando o conteúdo é reduzido para caber na tela.
const SECTION_BG = [
  "bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800", // capa
  "bg-slate-50", // resumo
  "bg-white", // timeline
  "bg-slate-50", // servicos
  "bg-white", // fotos
  "bg-slate-50", // graficos
  "bg-white", // caminho-critico
  "bg-gradient-to-br from-brand-950 via-brand-900 to-slate-950", // resultado
];

export function PresentationView({ data }: { data: ParadaCompleta }) {
  const [presentationMode, setPresentationMode] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const sectionNodes = useMemo(
    () => [
      <CoverSection key="capa" resumo={data.resumo} />,
      <SummarySection key="resumo" kpis={data.kpis} />,
      <TimelineSection key="timeline" timeline={data.timeline} />,
      <ServicesSection key="servicos" servicos={data.servicos} />,
      <GallerySection key="fotos" fotos={data.fotos} />,
      <ChartsSection key="graficos" graficos={data.graficos} />,
      <CriticalPathSection key="caminho-critico" itens={data.caminhoCritico} />,
      <ResultSection key="resultado" resultado={data.resultadoFinal} pendencias={data.pendencias} />,
    ],
    [data]
  );

  useEffect(() => {
    if (presentationMode) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = SECTIONS.findIndex((s) => s.id === entry.target.id);
            if (idx !== -1) setActiveIndex(idx);
          }
        });
      },
      { threshold: 0.45 }
    );
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [presentationMode]);

  const goTo = useCallback(
    (idx: number) => {
      const clamped = Math.max(0, Math.min(SECTIONS.length - 1, idx));
      setActiveIndex(clamped);
      if (!presentationMode) {
        document.getElementById(SECTIONS[clamped].id)?.scrollIntoView({ behavior: "smooth" });
      }
    },
    [presentationMode]
  );

  const enterPresentation = useCallback(async () => {
    setPresentationMode(true);
    try {
      await document.documentElement.requestFullscreen?.();
    } catch {
      // fullscreen indisponível — segue em modo apresentação mesmo assim
    }
  }, []);

  const exitPresentation = useCallback(() => {
    setPresentationMode(false);
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!presentationMode) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        goTo(activeIndex + 1);
      } else if (e.key === "ArrowLeft") {
        goTo(activeIndex - 1);
      } else if (e.key === "Escape") {
        exitPresentation();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [presentationMode, activeIndex, goTo, exitPresentation]);

  useEffect(() => {
    function onFsChange() {
      if (!document.fullscreenElement) setPresentationMode(false);
    }
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  if (presentationMode) {
    return (
      <div className={cn("fixed inset-0 z-50 overflow-hidden transition-colors duration-500", SECTION_BG[activeIndex])}>
        <AnimatePresence mode="wait">
          <motion.div
            key={SECTIONS[activeIndex].id}
            initial={{ opacity: 0, scale: 1.015 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.985 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="h-full w-full overflow-hidden"
          >
            <FitToScreen>{sectionNodes[activeIndex]}</FitToScreen>
          </motion.div>
        </AnimatePresence>

        <div className="pointer-events-none fixed inset-x-0 bottom-6 flex items-center justify-center gap-3 px-4">
          <div className="pointer-events-auto flex items-center gap-3 rounded-full bg-black/50 px-4 py-2.5 backdrop-blur-md">
            <button
              onClick={() => goTo(activeIndex - 1)}
              disabled={activeIndex === 0}
              className="text-white transition-opacity disabled:opacity-25"
              aria-label="Seção anterior"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="flex items-center gap-1.5">
              {SECTIONS.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => goTo(i)}
                  aria-label={s.label}
                  className={cn("h-1.5 rounded-full transition-all duration-300", i === activeIndex ? "w-6 bg-white" : "w-1.5 bg-white/30")}
                />
              ))}
            </div>
            <button
              onClick={() => goTo(activeIndex + 1)}
              disabled={activeIndex === SECTIONS.length - 1}
              className="text-white transition-opacity disabled:opacity-25"
              aria-label="Próxima seção"
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <button
            onClick={exitPresentation}
            className="pointer-events-auto flex items-center gap-1.5 rounded-full bg-black/50 px-4 py-2.5 text-xs font-bold text-white backdrop-blur-md transition-colors hover:bg-black/70"
          >
            <X size={14} />
            Sair (Esc)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Sidebar activeId={SECTIONS[activeIndex].id} onNavigate={(id) => goTo(SECTIONS.findIndex((s) => s.id === id))} onPresent={enterPresentation} titulo={data.resumo.nome} />
      <main className="presentation-scroll pb-20 lg:pb-0 lg:pl-72">{sectionNodes}</main>
    </div>
  );
}
