import type { ParadaResumo } from "@/lib/types";
import { cn, formatDateCompact, statusLabel } from "@/lib/utils";

const STATUS_TEXT: Record<string, string> = {
  concluida: "text-success-700",
  ressalvas: "text-warning-700",
  em_andamento: "text-brand-700",
};

// Leitura de instrumento, não cartão. Até o Bloco E2 esses números viviam
// numa caixa branca com borda e sombra flutuando por cima do hero escuro —
// exatamente a colisão que "pare de usar card pra tudo" pede pra eliminar:
// um componente claro pousado sobre um fundo que já tem identidade própria.
// Agora os números são tipografia pura direto sobre o gradiente/blueprint,
// separados por regra (hairline), não por caixa — como um painel real.
function Indicador({ label, value, dot }: { label: string; value: number; dot: string }) {
  return (
    <div className="flex-1">
      <div className="flex items-center gap-1.5">
        <span className={cn("h-1.5 w-1.5 flex-none rounded-full", dot)} aria-hidden="true" />
        <p className="label-tecnico text-[10px] font-bold text-brand-300">{label}</p>
      </div>
      <p className="mt-1.5 text-2xl font-bold leading-none tracking-tight text-white tabular-nums sm:text-3xl">{value}</p>
    </div>
  );
}

export function DashboardStats({ paradas }: { paradas: ParadaResumo[] }) {
  const total = paradas.length;
  const emAndamento = paradas.filter((p) => p.status === "em_andamento").length;
  const concluidas = paradas.filter((p) => p.status === "concluida").length;
  const ressalvas = paradas.filter((p) => p.status === "ressalvas").length;
  const relatoriosRecentes = [...paradas].sort((a, b) => b.data.localeCompare(a.data)).slice(0, 3);
  const mesAtual = new Date().toISOString().slice(0, 7);
  const paradasDoMes = paradas.filter((p) => p.data.startsWith(mesAtual));
  const taxaConclusaoMes = paradasDoMes.length ? Math.round((paradasDoMes.filter((p) => p.status === "concluida").length / paradasDoMes.length) * 100) : 0;
  const textoParadasDoMes = `${paradasDoMes.length} ${paradasDoMes.length === 1 ? "parada" : "paradas"}`;

  return (
    <div className="flex flex-wrap items-end gap-x-8 gap-y-6">
      {/* Número âncora: o total, isolado e no maior peso tipográfico da
          faixa — a mesma fonte de título (font-display) que assina a capa,
          não mais um número de card genérico. */}
      <div className="flex-none">
        <p className="label-tecnico text-[10px] font-bold text-brand-300">Paradas Registradas</p>
        <p className="font-display mt-1.5 text-5xl font-semibold leading-none tracking-tight text-white tabular-nums sm:text-6xl">{total}</p>
      </div>

      {/* Regra divisória em vez de borda de card — separa "o total" dos
          três indicadores secundários sem introduzir uma segunda forma. */}
      <div className="flex min-w-[240px] flex-1 gap-x-6 border-t border-white/10 pt-6 sm:border-l sm:border-t-0 sm:pl-8 sm:pt-0">
        {/* signal-400 (âmbar) em vez de brand nos pontos de "andamento" — dois
            azuis próximos (ponto + fundo do hero) quase somem um no outro;
            o âmbar é o mesmo acento de atenção já usado no resto do sistema. */}
        <Indicador label="Andamento" value={emAndamento} dot="bg-signal-400" />
        <Indicador label="Concluídas" value={concluidas} dot="bg-success-600" />
        <Indicador label="Ressalvas" value={ressalvas} dot="bg-warning-600" />
      </div>
      <div className="mt-7 grid w-full items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(300px,360px)]">
        <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-sm">
          <p className="label-tecnico text-[10px] font-bold text-brand-300">Comparativo recente</p>
          <p className="mt-1 text-sm font-bold text-white">Painel mensal: {textoParadasDoMes} · {taxaConclusaoMes}% concluídas</p>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10" role="progressbar" aria-label="Taxa de conclusão do mês" aria-valuemin={0} aria-valuemax={100} aria-valuenow={taxaConclusaoMes}>
            <div className="h-full rounded-full bg-success-600 transition-[width] duration-500" style={{ width: `${taxaConclusaoMes}%` }} />
          </div>
          <p className="mt-3 text-xs leading-relaxed text-brand-200">Use o Histórico para comparar tempo, eficiência, pendências e recorrências antes de aprovar a próxima programação.</p>
        </div>
        <section aria-label="Últimos relatórios" className="w-full rounded-2xl bg-white p-4 text-slate-900 shadow-xl lg:sticky lg:top-24">
          <p className="label-tecnico text-[10px] font-bold text-slate-500">Últimos relatórios</p>
          {relatoriosRecentes.length ? (
            <ul className="mt-3 space-y-2.5">
            {relatoriosRecentes.map((parada) => (
              <li key={parada.id} className="border-b border-slate-100 pb-2.5 last:border-0 last:pb-0">
                <div className="flex items-start justify-between gap-3 text-xs font-bold"><span className="min-w-0 truncate">{parada.maquina}</span><span className={cn("flex-none", STATUS_TEXT[parada.status] ?? "text-slate-600")}>{statusLabel(parada.status)}</span></div>
                <p className="mt-1 text-[11px] font-semibold text-slate-500">{formatDateCompact(parada.data)} · {parada.responsavel || "Sem responsável informado"}</p>
              </li>
            ))}
            </ul>
          ) : <p className="mt-3 text-xs font-semibold text-slate-500">Nenhum relatório registrado.</p>}
        </section>
      </div>
    </div>
  );
}
