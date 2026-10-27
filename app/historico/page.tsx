import { listHistoricoNaoFeito, listParadasHistorico } from "@/lib/actions/paradas";
import { ehEditor } from "@/lib/auth/session";
import { HistoricoCharts } from "@/components/dashboard/HistoricoCharts";
import { PortaoEditor } from "@/components/shared/PortaoEditor";
import { StatusConexao } from "@/components/shared/StatusConexao";
import { PageHeader } from "@/components/shared/PageHeader";

export const dynamic = "force-dynamic";

export default async function HistoricoPage() {
  // A decisao acontece antes da consulta: sem sessao, o banco nem e tocado e
  // nenhum numero de nenhum relatorio entra no HTML enviado ao navegador.
  const autorizado = await ehEditor();
  const itens = autorizado ? await listParadasHistorico() : [];
  const historicoNaoFeito = autorizado ? await listHistoricoNaoFeito() : [];

  return (
    <div className="min-h-screen bg-background">
      <PageHeader wide title="Histórico entre Paradas" subtitle="Eficiência, horas e pendências comparadas ao longo do tempo" />

      <StatusConexao />

      <main id="conteudo" className="mx-auto max-w-7xl px-4 py-8 sm:px-10 sm:py-10">
        {autorizado ? (
          <HistoricoCharts itens={itens} historicoNaoFeito={historicoNaoFeito} />
        ) : (
          <PortaoEditor titulo="Acesso Restrito" descricao="Digite a senha para comparar os indicadores entre paradas." />
        )}
      </main>
    </div>
  );
}
