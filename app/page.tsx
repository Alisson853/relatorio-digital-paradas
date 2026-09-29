import Image from "next/image";
import Link from "next/link";
import { Activity, ClipboardList, LineChart, Plus } from "lucide-react";
import { listParadasResumo } from "@/lib/actions/paradas";
import { ParadaGrid } from "@/components/dashboard/ParadaGrid";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { BackupControls } from "@/components/dashboard/BackupControls";
import { RecorrenciasNaoFeito } from "@/components/dashboard/RecorrenciasNaoFeito";
import { EditorOnly } from "@/components/shared/EditorOnly";
import { EditorToggle } from "@/components/shared/EditorToggle";
import { StatusConexao } from "@/components/shared/StatusConexao";

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

      <StatusConexao />

      {/* Faixa escura com textura de prancha técnica — a mesma linguagem
          visual da capa da apresentação (CoverSection), agora também na
          primeira coisa que se vê ao abrir o sistema. Antes o dashboard
          inteiro vivia sobre o mesmo cinza-claro de fundo, sem nada que
          sinalizasse "isto é um sistema industrial" antes de rolar a tela.

          Composição em duas faixas empilhadas (título sozinho, resumo
          operacional abaixo) em vez do título dividindo a linha com os
          números — as duas coisas não têm o mesmo peso: uma é identidade da
          tela, a outra é leitura de instrumento. Dar a cada uma sua própria
          faixa, separadas por regra, é o que evita uma faixa homogênea de
          dois blocos do mesmo tamanho. */}
      <div className="bg-blueprint relative overflow-hidden bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800 px-6 py-14 sm:px-10 sm:py-16">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-brand-500/15 blur-3xl" />
        <div className="relative mx-auto max-w-7xl">
          <span className="label-tecnico mb-4 inline-flex items-center gap-2 rounded-sm border border-white/15 bg-white/[0.06] px-3 py-1.5 text-[11px] font-bold text-brand-200">
            <span className="h-1.5 w-1.5 rounded-full bg-signal-500" />
            Manutenção Industrial
          </span>
          <h1 className="font-display max-w-2xl text-4xl font-semibold uppercase leading-[0.98] tracking-tight text-white sm:text-5xl">
            Relatório de Paradas de Manutenção
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-brand-200">
            Acompanhe cada parada de máquina em uma apresentação digital completa — indicadores, cronograma,
            serviços executados e resultados, prontos para reuniões de gestão.
          </p>

          <div className="mt-10 border-t border-white/10 pt-8">
            <DashboardStats paradas={paradas} />
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-6 py-12 sm:px-10">
        <RecorrenciasNaoFeito />

        <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <p className="label-tecnico text-[10px] font-bold text-brand-500">Registros</p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">Lista de Paradas</h2>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-slate-400">
              <Activity size={13} className="text-brand-500" />
              Atualizado em tempo real
            </p>
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
