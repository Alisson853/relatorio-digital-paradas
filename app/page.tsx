import Image from "next/image";
import Link from "next/link";
import { Activity, Gauge, Plus } from "lucide-react";
import { PARADAS_RESUMO } from "@/lib/mock-data";
import { ParadaGrid } from "@/components/dashboard/ParadaGrid";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { BackupControls } from "@/components/dashboard/BackupControls";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 sm:px-10">
          <div className="flex items-center gap-4">
            <Image src="/santher-logo-azul.png" alt="Santher" width={140} height={37} className="h-8 w-auto sm:h-9" priority />
            <div className="hidden h-8 w-px bg-slate-200 sm:block" />
            <div className="hidden sm:block">
              <p className="text-sm font-bold leading-none text-slate-900">Relatório Digital de Parada</p>
              <p className="mt-1 text-xs font-medium text-slate-400">Gestão de Paradas Industriais</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <BackupControls />
            <Link
              href="/novo"
              className="flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-brand-700"
            >
              <Plus size={15} />
              Nova Parada
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-12 sm:px-10">
        <div className="mb-12 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="mb-3 inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-brand-600">
              Manutenção Industrial
            </span>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              Relatório de Paradas de Manutenção
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-500">
              Acompanhe cada parada de máquina em uma apresentação digital completa — indicadores, cronograma,
              serviços executados e resultados, prontos para reuniões de gestão.
            </p>
          </div>

          <DashboardStats estaticas={PARADAS_RESUMO} />
        </div>

        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
            <Gauge size={16} className="text-brand-500" />
            Todas as paradas
            <span className="text-slate-300">•</span>
            <Activity size={16} className="text-brand-500" />
            Atualizado em tempo real
          </div>
          <Link href="/novo" className="flex items-center gap-1.5 text-sm font-bold text-brand-600 hover:text-brand-700">
            <Plus size={15} />
            Alimentar novo relatório
          </Link>
        </div>

        <ParadaGrid estaticas={PARADAS_RESUMO} />
      </main>

      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 px-6 text-center sm:px-10">
          <Image src="/santher-logo-azul.png" alt="Santher" width={100} height={26} className="h-5 w-auto opacity-70" />
          <p className="text-xs font-medium text-slate-400">Relatórios de Parada de Máquina</p>
        </div>
      </footer>
    </div>
  );
}
