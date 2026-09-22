import Image from "next/image";
import Link from "next/link";
import { Activity, ClipboardList, Gauge, LineChart, Plus } from "lucide-react";
import { listParadasResumo } from "@/lib/actions/paradas";
import { ParadaGrid } from "@/components/dashboard/ParadaGrid";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { BackupControls } from "@/components/dashboard/BackupControls";
import { RecorrenciasNaoFeito } from "@/components/dashboard/RecorrenciasNaoFeito";
import { EditorOnly } from "@/components/shared/EditorOnly";
import { EditorToggle } from "@/components/shared/EditorToggle";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const paradas = await listParadasResumo();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-slate-200 bg-white">
        {/* flex-wrap: cinco botoes mais a marca nao cabem numa linha de 490px.
            Sem poder quebrar, o flex espremia todo mundo — e quem cedia era a
            marca, que estava sem shrink-0 e chegava a largura ZERO: o logo
            simplesmente sumia da tela no celular. Agora os botoes descem pra
            segunda linha e a marca fica inteira. */}
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-y-3 px-6 py-5 sm:px-10">
          <div className="flex shrink-0 items-center gap-4">
            <Image src="/santher-logo-azul.png" alt="Santher" width={140} height={37} className="h-8 w-auto shrink-0 sm:h-9" priority />
            <div className="hidden h-8 w-px bg-slate-200 sm:block" />
            <div className="hidden sm:block">
              <p className="text-sm font-bold leading-none text-slate-900">Relatório Digital de Parada</p>
              <p className="mt-1 text-xs font-medium text-slate-400">Gestão de Paradas Industriais</p>
            </div>
          </div>
          {/* No estreito os botoes ocupam a largura toda e preenchem da esquerda:
              alinhados a direita, o ultimo deles sobrava sozinho no canto da
              segunda linha. Do sm pra cima voltam a se agrupar a direita, ao
              lado da marca, como sempre foram. */}
          <div className="flex w-full flex-wrap items-center justify-start gap-2 sm:w-auto sm:justify-end sm:gap-3">
            <Link
              href="/historico"
              className="flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50"
            >
              <LineChart size={15} />
              Histórico
            </Link>
            <EditorOnly>
              <Link
                href="/pendencias"
                className="flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50"
              >
                <ClipboardList size={15} />
                Pendências
              </Link>
              <BackupControls />
              <Link
                href="/novo"
                className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-brand-600 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-brand-700"
              >
                <Plus size={15} />
                Nova Parada
              </Link>
            </EditorOnly>
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

          <DashboardStats paradas={paradas} />
        </div>

        <RecorrenciasNaoFeito />

        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
            <Gauge size={16} className="text-brand-500" />
            Todas as paradas
            <span className="text-slate-300">•</span>
            <Activity size={16} className="text-brand-500" />
            Atualizado em tempo real
          </div>
          <EditorOnly>
            {/* O link tinha a altura do proprio texto: 20px de alvo. O padding
                leva a area clicavel a 36px e as margens negativas devolvem o
                espaco, entao nada em volta se mexe. */}
            <Link href="/novo" className="-mx-2 -my-2 flex items-center gap-1.5 px-2 py-2 text-sm font-bold text-brand-600 hover:text-brand-700">
              <Plus size={15} />
              Alimentar novo relatório
            </Link>
          </EditorOnly>
        </div>

        <ParadaGrid paradas={paradas} />
      </main>

      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 px-6 text-center sm:px-10">
          <Image src="/santher-logo-azul.png" alt="Santher" width={100} height={26} className="h-5 w-auto opacity-70" />
          <p className="text-xs font-medium text-slate-400">Relatórios de Parada de Máquina</p>
          <EditorToggle />
        </div>
      </footer>
    </div>
  );
}
