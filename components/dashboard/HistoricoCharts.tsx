"use client";

import { useState } from "react";
import Link from "next/link";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ParadaHistoricoItem } from "@/lib/actions/paradas";
import type { HistoricoNaoFeitoItem } from "@/lib/historico-nao-feito";
import { MOTIVOS_NAO_FEITO, type Equipe } from "@/lib/types";
import { cn, formatDate, formatDateCompact } from "@/lib/utils";

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid #dbe2ee",
  boxShadow: "0 4px 12px rgba(16,24,40,0.08)",
  fontSize: 12,
  fontWeight: 600,
};

// Ordem fixa (pras chips de filtro não pularem de lugar a cada render) e uma
// cor por equipe, pro gráfico comparativo distinguir as séries.
const EQUIPE_ORDEM: Equipe[] = ["Elétrica", "Mecânica", "Instrumentação", "Operação", "Segurança", "Civil", "Caldeiraria", "Preditiva", "Lubrificação"];
const CORES_EQUIPE: Record<Equipe, string> = {
  Elétrica: "#f59e0b",
  Mecânica: "#1b4d99",
  Instrumentação: "#8b5cf6",
  Operação: "#10b981",
  Segurança: "#ef4444",
  Civil: "#78716c",
  Caldeiraria: "#0891b2",
  Preditiva: "#db2777",
  Lubrificação: "#65a30d",
};

function ChartCard({ title, subtitle, children, extra }: { title: string; subtitle: string; children: React.ReactNode; extra?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">{title}</h3>
          <p className="text-xs font-medium text-slate-400">{subtitle}</p>
        </div>
        {extra}
      </div>
      <div className="mt-4 h-64">{children}</div>
    </div>
  );
}

// Comparação de equipes: OS ou horas por equipe, uma série por equipe, ao
// longo das paradas. Só entram no seletor as equipes que aparecem em ao
// menos um relatório — senão a lista de chips fica cheia de times que nunca
// trabalharam ali (ex: uma planta sem Caldeiraria).
function GraficoPorEquipe({ itens }: { itens: ParadaHistoricoItem[] }) {
  const equipesComDados = EQUIPE_ORDEM.filter((eq) => itens.some((item) => item.porEquipe.some((e) => e.equipe === eq)));
  const [metrica, setMetrica] = useState<"quantidade" | "horas">("quantidade");
  const [equipesAtivas, setEquipesAtivas] = useState<Equipe[]>(equipesComDados);

  function alternarEquipe(equipe: Equipe) {
    setEquipesAtivas((prev) => (prev.includes(equipe) ? prev.filter((e) => e !== equipe) : [...prev, equipe]));
  }

  if (equipesComDados.length === 0) return null;

  const dados = itens.map((item) => {
    const linha: Record<string, string | number> = {
      // Nomes de relatório se repetem entre paradas (ex: várias "Relatório
      // Preventiva MP09") — a data é o que realmente distingue uma barra da
      // outra, então é ela que vai no eixo, não o nome truncado.
      dataLabel: formatDateCompact(item.resumo.data),
      nomeCompleto: item.resumo.nome,
      dataCompleta: formatDate(item.resumo.data),
      id: item.resumo.id,
    };
    for (const e of item.porEquipe) linha[e.equipe] = metrica === "quantidade" ? e.quantidade : e.horas;
    return linha;
  });

  return (
    <ChartCard
      title="OS por Equipe"
      subtitle="Quem está com mais volume, parada a parada"
      extra={
        <div className="flex rounded-lg border border-slate-200 p-0.5 text-[11px] font-bold">
          {(["quantidade", "horas"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMetrica(m)}
              className={cn("rounded-md px-2.5 py-1 transition-colors", metrica === m ? "bg-brand-600 text-white" : "text-slate-500 hover:bg-slate-50")}
            >
              {m === "quantidade" ? "OS" : "Horas"}
            </button>
          ))}
        </div>
      }
    >
      <div className="mb-2 flex flex-wrap gap-1.5">
        {equipesComDados.map((eq) => {
          const ativa = equipesAtivas.includes(eq);
          return (
            <button
              key={eq}
              type="button"
              onClick={() => alternarEquipe(eq)}
              style={ativa ? { borderColor: CORES_EQUIPE[eq], backgroundColor: `${CORES_EQUIPE[eq]}1a`, color: CORES_EQUIPE[eq] } : undefined}
              className={cn("rounded-full border px-2.5 py-1 text-[10px] font-bold transition-colors", !ativa && "border-slate-200 text-slate-400 hover:bg-slate-50")}
            >
              {eq}
            </button>
          );
        })}
      </div>
      <ResponsiveContainer width="100%" height="90%">
        <BarChart data={dados} margin={{ left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef1f7" vertical={false} />
          <XAxis dataKey="dataLabel" tick={{ fontSize: 10, fill: "#64749a" }} interval={0} angle={-20} textAnchor="end" height={50} />
          <YAxis tick={{ fontSize: 11, fill: "#64749a" }} allowDecimals={metrica === "horas"} />
          <Tooltip contentStyle={tooltipStyle} labelFormatter={(_, p) => `${p?.[0]?.payload?.nomeCompleto} — ${p?.[0]?.payload?.dataCompleta}`} />
          {equipesAtivas.map((eq) => (
            <Bar key={eq} dataKey={eq} name={eq} radius={[4, 4, 0, 0]} fill={CORES_EQUIPE[eq]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// Quantas vezes cada categoria de "não será feito" apareceu, somando todos
// os relatórios — é o que mostra se o problema é sempre o mesmo (ex: falta
// de material se repetindo) em vez de casos isolados e diferentes entre si.
function GraficoMotivosNaoFeito({ historicoNaoFeito }: { historicoNaoFeito: HistoricoNaoFeitoItem[] }) {
  const dados = MOTIVOS_NAO_FEITO.map((categoria) => ({
    categoria,
    quantidade: historicoNaoFeito.filter((h) => h.categoria === categoria).length,
  })).filter((d) => d.quantidade > 0);

  if (dados.length === 0) return null;

  return (
    <ChartCard title="Motivos de Não Feito" subtitle="Somando todos os relatórios">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={dados} layout="vertical" margin={{ left: 24 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef1f7" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11, fill: "#64749a" }} allowDecimals={false} />
          <YAxis type="category" dataKey="categoria" tick={{ fontSize: 11, fill: "#64749a" }} width={132} />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey="quantidade" name="Ocorrências" radius={[0, 6, 6, 0]} fill="#c0392b" />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function HistoricoCharts({ itens, historicoNaoFeito }: { itens: ParadaHistoricoItem[]; historicoNaoFeito: HistoricoNaoFeitoItem[] }) {
  if (itens.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 bg-white py-20 text-center">
        <p className="text-sm font-medium text-slate-400">Nenhum relatório cadastrado ainda.</p>
      </div>
    );
  }

  const dados = itens.map((item) => ({
    // Nomes de relatório se repetem entre paradas (ex: várias "Relatório
    // Preventiva MP09") — a data é o que realmente distingue uma barra da
    // outra nos gráficos, então é ela que vai no eixo, não o nome truncado.
    dataLabel: formatDateCompact(item.resumo.data),
    nomeCompleto: item.resumo.nome,
    data: formatDate(item.resumo.data),
    maquina: item.resumo.maquina,
    eficiencia: item.kpis.eficiencia,
    horasTrabalhadas: item.kpis.horasTrabalhadas,
    pendencias: item.kpis.pendencias,
    osPlanejadas: item.kpis.osPlanejadas,
    osConcluidas: item.kpis.osConcluidas,
    id: item.resumo.id,
  }));

  const mediaEficiencia = Math.round((dados.reduce((sum, d) => sum + d.eficiencia, 0) / dados.length) * 10) / 10;
  const totalPendencias = dados.reduce((sum, d) => sum + d.pendencias, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-2xl font-bold text-slate-900">{dados.length}</p>
          <p className="text-xs font-medium text-slate-400">Paradas registradas</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-2xl font-bold text-slate-900">{mediaEficiencia}%</p>
          <p className="text-xs font-medium text-slate-400">Eficiência média</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-2xl font-bold text-slate-900">{dados.reduce((sum, d) => sum + d.horasTrabalhadas, 0)}</p>
          <p className="text-xs font-medium text-slate-400">Horas trabalhadas (total)</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-2xl font-bold text-slate-900">{totalPendencias}</p>
          <p className="text-xs font-medium text-slate-400">Pendências (total)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ChartCard title="Eficiência ao Longo do Tempo" subtitle="Percentual concluído por parada">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dados} margin={{ left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef1f7" vertical={false} />
              <XAxis dataKey="dataLabel" tick={{ fontSize: 10, fill: "#64749a" }} interval={0} angle={-20} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 11, fill: "#64749a" }} domain={[0, 100]} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => `${v}%`} labelFormatter={(_, p) => `${p?.[0]?.payload?.nomeCompleto} — ${p?.[0]?.payload?.data}`} />
              <Line type="monotone" dataKey="eficiencia" stroke="#1b4d99" strokeWidth={2.5} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Horas Trabalhadas" subtitle="Duração de cada parada">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dados} margin={{ left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef1f7" vertical={false} />
              <XAxis dataKey="dataLabel" tick={{ fontSize: 10, fill: "#64749a" }} interval={0} angle={-20} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 11, fill: "#64749a" }} />
              <Tooltip contentStyle={tooltipStyle} labelFormatter={(_, p) => `${p?.[0]?.payload?.nomeCompleto} — ${p?.[0]?.payload?.data}`} />
              <Bar dataKey="horasTrabalhadas" radius={[6, 6, 0, 0]} fill="#4a83d4" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Pendências por Parada" subtitle="OS planejadas que não fecharam">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dados} margin={{ left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef1f7" vertical={false} />
              <XAxis dataKey="dataLabel" tick={{ fontSize: 10, fill: "#64749a" }} interval={0} angle={-20} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 11, fill: "#64749a" }} />
              <Tooltip contentStyle={tooltipStyle} labelFormatter={(_, p) => `${p?.[0]?.payload?.nomeCompleto} — ${p?.[0]?.payload?.data}`} />
              <Bar dataKey="pendencias" radius={[6, 6, 0, 0]} fill="#b8760f" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="OS Planejadas x Concluídas" subtitle="Volume de trabalho por parada">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dados} margin={{ left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef1f7" vertical={false} />
              <XAxis dataKey="dataLabel" tick={{ fontSize: 10, fill: "#64749a" }} interval={0} angle={-20} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 11, fill: "#64749a" }} />
              <Tooltip contentStyle={tooltipStyle} labelFormatter={(_, p) => `${p?.[0]?.payload?.nomeCompleto} — ${p?.[0]?.payload?.data}`} />
              <Bar dataKey="osPlanejadas" name="Planejadas" radius={[6, 6, 0, 0]} fill="#b7cff0" />
              <Bar dataKey="osConcluidas" name="Concluídas" radius={[6, 6, 0, 0]} fill="#1b4d99" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <div className="lg:col-span-2">
          <GraficoPorEquipe itens={itens} />
        </div>

        <GraficoMotivosNaoFeito historicoNaoFeito={historicoNaoFeito} />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-5 py-3">Parada</th>
              <th className="px-5 py-3">Máquina</th>
              <th className="px-5 py-3">Data</th>
              <th className="px-5 py-3">Eficiência</th>
              <th className="px-5 py-3">Horas</th>
              <th className="px-5 py-3">Pendências</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {[...dados].reverse().map((d) => (
              <tr key={d.id} className="hover:bg-slate-50">
                <td className="px-5 py-3 font-semibold text-slate-800">
                  <Link href={`/parada/${d.id}`} className="hover:text-brand-600 hover:underline">
                    {d.nomeCompleto}
                  </Link>
                </td>
                <td className="px-5 py-3 text-slate-500">{d.maquina}</td>
                <td className="px-5 py-3 text-slate-500">{d.data}</td>
                <td className="px-5 py-3 font-semibold text-slate-800">{d.eficiencia}%</td>
                <td className="px-5 py-3 text-slate-500">{d.horasTrabalhadas}h</td>
                <td className="px-5 py-3 text-slate-500">{d.pendencias}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
