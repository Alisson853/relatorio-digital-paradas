"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { ParadaCompleta } from "@/lib/types";
import { SECTIONS, type SectionMeta } from "@/lib/sections";
import { cn } from "@/lib/utils";
import { Sidebar } from "./Sidebar";
import { FitToScreen } from "./FitToScreen";
import { CoverSection } from "./sections/CoverSection";
import { SummarySection, type SummaryCardLabel } from "./sections/SummarySection";
import { TimelineSection } from "./sections/TimelineSection";
import { ServicesSection, type FiltroServicos } from "./sections/ServicesSection";
import { GallerySection } from "./sections/GallerySection";
import { ChartsSection } from "./sections/ChartsSection";
import { CriticalPathSection } from "./sections/CriticalPathSection";
import { ResultSection } from "./sections/ResultSection";
import { PrintReport } from "./PrintReport";

export function PresentationView({ data, qrDataUrl }: { data: ParadaCompleta; qrDataUrl?: string }) {
  const [presentationMode, setPresentationMode] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  // Setado quando um card do Resumo Executivo com uma lista de OS por trás
  // é clicado — estreita o carrossel de Serviços a essa condição (categoria,
  // equipe, status...). Mora aqui (não dentro de ServicesSection) porque
  // quem dispara a mudança é a seção de Resumo, uma irmã dela.
  const [filtroServicos, setFiltroServicos] = useState<FiltroServicos | null>(null);

  // Refs (não state) pra irParaSecao sempre enxergar a versão mais recente
  // de "sections"/"presentationMode" sem precisar entrar nas dependências do
  // useMemo de secoesAtivas — que ficaria circular, já que "sections" é
  // derivado DE secoesAtivas. Atualizadas a cada render, lidas só dentro do
  // clique (bem depois desse render terminar), então nunca chegam atrasadas
  // na hora que importa.
  const sectionsRef = useRef<SectionMeta[]>([]);
  const presentationModeRef = useRef(presentationMode);
  useEffect(() => {
    presentationModeRef.current = presentationMode;
  }, [presentationMode]);

  // Vai direto pra uma seção pelo id — usado pelos cards do Resumo
  // Executivo ("Pendências", "Etiqueta Vermelha/Amarela") pra pular pra onde
  // aquele número é detalhado. Referência estável (deps vazias) de propósito:
  // é o que permite usá-la dentro de secoesAtivas sem criar uma dependência
  // circular com "sections".
  const irParaSecao = useCallback((id: string) => {
    const idx = sectionsRef.current.findIndex((s) => s.id === id);
    if (idx === -1) return;
    setActiveIndex(idx);
    if (!presentationModeRef.current) {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  // Decide pra onde cada card do Resumo Executivo leva. "Segurança" é o
  // único indicador sem card clicável (SummarySection não chama isto pra
  // ele) — todos os outros viram um atalho: pra Serviços com um filtro, ou
  // direto pra Gráficos/Resultado quando o número não é sobre uma lista de
  // OS específica. Referência estável (só depende de irParaSecao, que também
  // é estável) pelo mesmo motivo de irParaSecao: usada dentro de
  // secoesAtivas sem criar dependência circular com "sections".
  const handleKpiClick = useCallback(
    (label: SummaryCardLabel) => {
      switch (label) {
        case "Pendências":
          irParaSecao("resultado");
          return;
        case "Etiqueta Vermelha":
          setFiltroServicos({ label: "Etiqueta Vermelha", predicate: (s) => s.categoria === "Etiqueta Vermelha" });
          irParaSecao("servicos");
          return;
        case "Etiqueta Amarela":
          setFiltroServicos({ label: "Etiqueta Amarela", predicate: (s) => s.categoria === "Etiqueta Amarela" });
          irParaSecao("servicos");
          return;
        case "OS Planejadas":
          setFiltroServicos(null);
          irParaSecao("servicos");
          return;
        case "OS Concluídas":
          setFiltroServicos({ label: "OS Concluídas", predicate: (s) => s.status === "concluido" });
          irParaSecao("servicos");
          return;
        case "OS Elétrica":
          setFiltroServicos({ label: "Equipe Elétrica", predicate: (s) => s.equipe === "Elétrica" });
          irParaSecao("servicos");
          return;
        case "OS Mecânica":
          setFiltroServicos({ label: "Equipe Mecânica", predicate: (s) => s.equipe === "Mecânica" });
          irParaSecao("servicos");
          return;
        case "OS Instrumentação":
          setFiltroServicos({ label: "Equipe Instrumentação", predicate: (s) => s.equipe === "Instrumentação" });
          irParaSecao("servicos");
          return;
        case "Eficiência":
        case "Horas Trabalhadas":
          irParaSecao("graficos");
          return;
      }
    },
    [irParaSecao]
  );

  // "O Que Não Foi Feito" mistura duas origens: as pendências digitadas à
  // mão no formulário /novo (data.pendencias) e os serviços que um técnico
  // marcou como "não será feito" pelo celular (a caixinha da Captura
  // Rápida) — que até aqui só apareciam pro editor no checklist de
  // pendências do dashboard, nunca na apresentação em si.
  const pendenciasDeServicosNaoFeitos = useMemo(
    () =>
      data.servicos
        .filter((s) => s.naoFeitoCategoria)
        .map((s) => ({
          id: `naofeito-${s.id}`,
          item: s.numeroOS !== "Oportunidade" ? `OS ${s.numeroOS} — ${s.titulo || s.equipamento}` : s.titulo || s.equipamento,
          motivo: s.justificativaNaoFeito ? `${s.naoFeitoCategoria} — ${s.justificativaNaoFeito}` : s.naoFeitoCategoria!,
        })),
    [data.servicos]
  );

  // Cada seção só entra na apresentação se tiver conteúdo — evita ficar
  // exibindo um título vazio (ex: "Linha do Tempo" sem nenhum evento).
  const secoesAtivas = useMemo(() => {
    const candidatas: Array<{ id: string; node: React.ReactNode; bg: string } | false> = [
      {
        id: "capa",
        node: <CoverSection key="capa" resumo={data.resumo} />,
        bg: "bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800",
      },
      {
        id: "resumo",
        node: <SummarySection key="resumo" kpis={data.kpis} onCardClick={handleKpiClick} />,
        bg: "bg-slate-50",
      },
      data.timeline.length > 0 && {
        id: "timeline",
        node: <TimelineSection key="timeline" timeline={data.timeline} />,
        bg: "bg-white",
      },
      {
        id: "servicos",
        node: (
          <ServicesSection
            key="servicos"
            servicos={data.servicos}
            filtro={filtroServicos}
            onLimparFiltro={() => setFiltroServicos(null)}
          />
        ),
        bg: "bg-slate-50",
      },
      { id: "fotos", node: <GallerySection key="fotos" fotos={data.fotos} />, bg: "bg-white" },
      { id: "graficos", node: <ChartsSection key="graficos" graficos={data.graficos} />, bg: "bg-slate-50" },
      data.caminhoCritico.length > 0 && {
        id: "caminho-critico",
        node: <CriticalPathSection key="caminho-critico" itens={data.caminhoCritico} />,
        bg: "bg-white",
      },
      {
        id: "resultado",
        node: <ResultSection key="resultado" resultado={data.resultadoFinal} pendencias={[...data.pendencias, ...pendenciasDeServicosNaoFeitos]} />,
        bg: "bg-gradient-to-br from-brand-950 via-brand-900 to-slate-950",
      },
    ];
    return candidatas.filter((s): s is { id: string; node: React.ReactNode; bg: string } => !!s);
  }, [data, filtroServicos, handleKpiClick, pendenciasDeServicosNaoFeitos]);

  const sections = useMemo(
    () => SECTIONS.filter((meta) => secoesAtivas.some((s) => s.id === meta.id)),
    [secoesAtivas]
  );
  // Sincroniza a ref com a versão fresca de "sections" — é o que faz
  // irParaSecao (referência estável, criada uma vez) sempre enxergar a lista
  // atual sem precisar recriar a função nem entrar nas dependências de
  // secoesAtivas.
  useEffect(() => {
    sectionsRef.current = sections;
  }, [sections]);
  const sectionNodes = useMemo(() => secoesAtivas.map((s) => s.node), [secoesAtivas]);
  const SECTION_BG = useMemo(() => secoesAtivas.map((s) => s.bg), [secoesAtivas]);

  useEffect(() => {
    if (presentationMode) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = sections.findIndex((s) => s.id === entry.target.id);
            if (idx !== -1) setActiveIndex(idx);
          }
        });
      },
      { threshold: 0.45 }
    );
    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [presentationMode, sections]);

  const goTo = useCallback(
    (idx: number) => {
      const clamped = Math.max(0, Math.min(sections.length - 1, idx));
      setActiveIndex(clamped);
      if (!presentationMode) {
        document.getElementById(sections[clamped].id)?.scrollIntoView({ behavior: "smooth" });
      }
    },
    [presentationMode, sections]
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
      <div className={cn("fixed inset-0 z-50 overflow-hidden transition-colors duration-500 print:hidden", SECTION_BG[activeIndex])}>
        <AnimatePresence mode="wait">
          <motion.div
            key={sections[activeIndex].id}
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
              {sections.map((s, i) => (
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
              disabled={activeIndex === sections.length - 1}
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
      <div className="print:hidden">
        <Sidebar
          sections={sections}
          activeId={sections[activeIndex].id}
          onNavigate={(id) => goTo(sections.findIndex((s) => s.id === id))}
          onPresent={enterPresentation}
          titulo={data.resumo.nome}
          paradaId={data.resumo.id}
        />
        <main className="presentation-scroll pb-20 lg:pb-0 lg:pl-72">{sectionNodes}</main>
      </div>
      <PrintReport data={data} qrDataUrl={qrDataUrl} />
    </div>
  );
}
