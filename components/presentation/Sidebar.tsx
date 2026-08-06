"use client";

import Link from "next/link";
import { ArrowLeft, Maximize2 } from "lucide-react";
import { SECTIONS } from "@/lib/sections";
import { cn } from "@/lib/utils";

interface SidebarProps {
  activeId: string;
  onNavigate: (id: string) => void;
  onPresent: () => void;
  titulo: string;
}

export function Sidebar({ activeId, onNavigate, onPresent, titulo }: SidebarProps) {
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-5">
          <Link href="/" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700">
            <ArrowLeft size={16} />
          </Link>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-900">{titulo}</p>
            <p className="text-[11px] font-medium text-slate-400">Relatório Digital</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
          {SECTIONS.map((section) => {
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

        <div className="border-t border-slate-100 p-4">
          <button
            onClick={onPresent}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-950 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-slate-900"
          >
            <Maximize2 size={16} />
            Modo Apresentação
          </button>
        </div>
      </aside>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur lg:hidden">
        <div className="no-scrollbar flex items-center gap-1 overflow-x-auto px-3 py-2.5">
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            const active = section.id === activeId;
            return (
              <button
                key={section.id}
                onClick={() => onNavigate(section.id)}
                className={cn(
                  "flex flex-none flex-col items-center gap-1 rounded-lg px-3 py-1.5 text-[10px] font-bold transition-colors",
                  active ? "bg-brand-600 text-white" : "text-slate-400"
                )}
              >
                <Icon size={16} />
                {section.label}
              </button>
            );
          })}
          <button
            onClick={onPresent}
            className="ml-1 flex flex-none items-center gap-1.5 rounded-lg bg-brand-950 px-3 py-2 text-[10px] font-bold text-white"
          >
            <Maximize2 size={14} />
            Apresentar
          </button>
        </div>
      </div>
    </>
  );
}
