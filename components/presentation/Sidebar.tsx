"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Camera, FileDown, FileText, Maximize2, MoreHorizontal, Presentation, ScrollText, X } from "lucide-react";
import type { SectionMeta } from "@/lib/sections";
import { cn } from "@/lib/utils";
import { useEditorMode } from "@/lib/useEditorMode";

interface SidebarProps {
  sections: SectionMeta[];
  activeId: string;
  onNavigate: (id: string) => void;
  onPresent: () => void;
  titulo: string;
  paradaId: string;
}

export function Sidebar({ sections, activeId, onNavigate, onPresent, titulo, paradaId }: SidebarProps) {
  const { isEditor } = useEditorMode();
  // No celular, "Apresentar" + as quatro exportações + Captura Rápida viviam
  // na MESMA fila de rolagem que as seis abas de conteúdo — doze alvos de
  // toque pequenos, e as ações que mais importam em campo (Apresentar,
  // Captura) tinham o mesmo peso visual que formatos de export que quase
  // ninguém usa pelo celular (PPTX/DOCX/RTF são fluxo de escritório). Isso
  // move as ações secundárias pra um painel à parte, liberando a fila
  // principal só para navegação entre seções.
  const [maisAbertoMobile, setMaisAbertoMobile] = useState(false);
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="border-b border-slate-100 px-6 py-5">
          <Image src="/santher-logo-azul.png" alt="Santher" width={120} height={32} className="h-6 w-auto" />
        </div>
        <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-4">
          <Link href="/" className="flex h-8 w-8 flex-none items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700">
            <ArrowLeft size={16} />
          </Link>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-900">{titulo}</p>
            <p className="text-[11px] font-medium text-slate-400">Relatório Digital</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
          {sections.map((section) => {
            const Icon = section.icon;
            const active = section.id === activeId;
            return (
              <button
                key={section.id}
                onClick={() => onNavigate(section.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors",
                  active ? "bg-brand-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                )}
              >
                <Icon size={17} strokeWidth={2.2} />
                {section.label}
              </button>
            );
          })}
        </nav>

        <div className="space-y-2 border-t border-slate-100 p-4">
          <button
            onClick={onPresent}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-950 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-slate-900"
          >
            <Maximize2 size={16} />
            Modo Apresentação
          </button>
          {isEditor && (
            <>
              <Link
                href={`/parada/${paradaId}/fotos`}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm font-bold text-brand-700 transition-colors hover:bg-brand-100"
              >
                <Camera size={16} />
                Captura Rápida (Celular)
              </Link>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-2 py-2.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50"
                >
                  <FileDown size={14} />
                  PDF
                </button>
                <a
                  href={`/api/export/pptx/${paradaId}`}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-2 py-2.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50"
                >
                  <Presentation size={14} />
                  PPTX
                </a>
                <a
                  href={`/api/export/docx/${paradaId}`}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-2 py-2.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50"
                >
                  <FileText size={14} />
                  DOCX
                </a>
                <a
                  href={`/api/export/rtf/${paradaId}`}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-2 py-2.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50"
                >
                  <ScrollText size={14} />
                  RTF
                </a>
              </div>
            </>
          )}
        </div>
      </aside>

      {/* Barra de navegação do celular: só as seis abas de conteúdo, cada uma
          com alvo de toque de ~44px de altura (py-2 + ícone 18 + rótulo).
          O esmaecimento na borda direita avisa que a fila rola pra ver mais,
          quando as abas não cabem todas — a máscara é fixa na borda do
          elemento (não acompanha o scroll), e o padding da direita tem a
          mesma largura dela, então quando a fila chega ao fim quem fica sob
          o esmaecimento é espaço vazio, não a última aba. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur lg:hidden">
        <div className="relative flex items-stretch">
        <div className="no-scrollbar flex items-stretch gap-1 overflow-x-auto px-2 py-1.5 pr-8 [mask-image:linear-gradient(to_right,black_calc(100%-2rem),transparent)]">
          {sections.map((section) => {
            const Icon = section.icon;
            const active = section.id === activeId;
            return (
              <button
                key={section.id}
                onClick={() => onNavigate(section.id)}
                className={cn(
                  "flex min-w-[64px] flex-none flex-col items-center justify-center gap-1 rounded-lg px-2.5 py-2 text-[11px] font-bold transition-colors",
                  active ? "bg-brand-600 text-white" : "text-slate-400 active:bg-slate-100"
                )}
              >
                <Icon size={18} />
                {section.label}
              </button>
            );
          })}
        </div>

        {/* Botão fixo (fora da fila que rola) pras ações secundárias —
            Apresentar, Captura Rápida e os quatro formatos de export. Fica
            sempre visível, sobreposto à máscara de esmaecimento, então quem
            usa nunca perde essas ações rolando a fila de seções pro lado
            errado atrás delas. */}
        <button
          type="button"
          onClick={() => setMaisAbertoMobile(true)}
          aria-label="Mais ações"
          aria-haspopup="true"
          aria-expanded={maisAbertoMobile}
          className="absolute right-1.5 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white text-slate-500 shadow-[-8px_0_10px_-4px_rgba(255,255,255,0.95)]"
        >
          <MoreHorizontal size={20} />
        </button>
        </div>
      </div>

      <AnimatePresence>
        {maisAbertoMobile && (
          <>
            <motion.button
              type="button"
              aria-label="Fechar"
              onClick={() => setMaisAbertoMobile(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-slate-900/30 lg:hidden"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="fixed inset-x-0 bottom-0 z-40 rounded-t-2xl border-t border-slate-200 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(16,24,40,0.12)] lg:hidden"
            >
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-bold text-slate-900">Mais Ações</p>
                <button
                  type="button"
                  onClick={() => setMaisAbertoMobile(false)}
                  aria-label="Fechar"
                  className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => {
                    setMaisAbertoMobile(false);
                    onPresent();
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-950 px-4 py-3.5 text-sm font-bold text-white"
                >
                  <Maximize2 size={16} />
                  Modo Apresentação
                </button>

                {isEditor && (
                  <>
                    <Link
                      href={`/parada/${paradaId}/fotos`}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3.5 text-sm font-bold text-brand-700"
                    >
                      <Camera size={16} />
                      Captura Rápida (Celular)
                    </Link>

                    <p className="pt-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">Exportar</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          setMaisAbertoMobile(false);
                          window.print();
                        }}
                        className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-2 py-3 text-xs font-bold text-slate-600"
                      >
                        <FileDown size={14} />
                        PDF
                      </button>
                      <a
                        href={`/api/export/pptx/${paradaId}`}
                        className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-2 py-3 text-xs font-bold text-slate-600"
                      >
                        <Presentation size={14} />
                        PPTX
                      </a>
                      <a
                        href={`/api/export/docx/${paradaId}`}
                        className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-2 py-3 text-xs font-bold text-slate-600"
                      >
                        <FileText size={14} />
                        DOCX
                      </a>
                      <a
                        href={`/api/export/rtf/${paradaId}`}
                        className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-2 py-3 text-xs font-bold text-slate-600"
                      >
                        <ScrollText size={14} />
                        RTF
                      </a>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
