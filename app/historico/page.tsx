import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { listHistoricoNaoFeito, listParadasHistorico } from "@/lib/actions/paradas";
import { ehEditor } from "@/lib/auth/session";
import { HistoricoCharts } from "@/components/dashboard/HistoricoCharts";
import { PortaoEditor } from "@/components/shared/PortaoEditor";
import { StatusConexao } from "@/components/shared/StatusConexao";

export const dynamic = "force-dynamic";

export default async function HistoricoPage() {
  // A decisao acontece antes da consulta: sem sessao, o banco nem e tocado e
  // nenhum numero de nenhum relatorio entra no HTML enviado ao navegador.
  const autorizado = await ehEditor();
  const itens = autorizado ? await listParadasHistorico() : [];
  const historicoNaoFeito = autorizado ? await listHistoricoNaoFeito() : [];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-6 py-5 sm:px-10">
          <Link href="/" className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700">
            <ArrowLeft size={16} />
          </Link>
          <Image src="/santher-logo-azul.png" alt="Santher" width={120} height={32} className="h-6 w-auto" />
          <div className="h-8 w-px bg-slate-200" />
          <div>
            <p className="text-sm font-bold leading-none text-slate-900">Histórico entre Paradas</p>
            <p className="mt-1 text-xs font-medium text-slate-400">Eficiência, horas e pendências comparadas ao longo do tempo</p>
          </div>
        </div>
      </header>

      <StatusConexao />

      <main className="mx-auto max-w-7xl px-6 py-10 sm:px-10">
        {autorizado ? (
          <HistoricoCharts itens={itens} historicoNaoFeito={historicoNaoFeito} />
        ) : (
          <PortaoEditor titulo="Acesso Restrito" descricao="Digite a senha para comparar os indicadores entre paradas." />
        )}
      </main>
    </div>
  );
}
