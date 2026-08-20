"use client";

import Link from "next/link";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ParadaHistoricoItem } from "@/lib/actions/paradas";
import { formatDate } from "@/lib/utils";

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid #dbe2ee",
  boxShadow: "0 4px 12px rgba(16,24,40,0.08)",
  fontSize: 12,
  fontWeight: 600,
};

function ChartCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      <p className="text-xs font-medium text-slate-400">{subtitle}</p>
      <div className="mt-4 h-64">{children}</div>
    </div>
  );
}

export function HistoricoCharts({ itens }: { itens: ParadaHistoricoItem[] }) {
  if (itens.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 bg-white py-20 text-center">
        <p className="text-sm font-medium text-slate-400">Nenhum relatório cadastrado ainda.</p>
      </div>
    );
  }

  const dados = itens.map((item) => ({
    nome: item.resumo.nome.length > 18 ? `${item.resumo.nome.slice(0, 18)}…` : item.resumo.nome,
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
              <XAxis dataKey="nome" tick={{ fontSize: 10, fill: "#64749a" }} interval={0} angle={-20} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 11, fill: "#64749a" }} domain={[0, 100]} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => `${v}%`} labelFormatter={(_, p) => p?.[0]?.payload?.nomeCompleto} />
              <Line type="monotone" dataKey="eficiencia" stroke="#1b4d99" strokeWidth={2.5} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Horas Trabalhadas" subtitle="Duração de cada parada">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dados} margin={{ left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef1f7" vertical={false} />
              <XAxis dataKey="nome" tick={{ fontSize: 10, fill: "#64749a" }} interval={0} angle={-20} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 11, fill: "#64749a" }} />
              <Tooltip contentStyle={tooltipStyle} labelFormatter={(_, p) => p?.[0]?.payload?.nomeCompleto} />
              <Bar dataKey="horasTrabalhadas" radius={[6, 6, 0, 0]} fill="#4a83d4" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Pendências por Parada" subtitle="OS planejadas que não fecharam">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dados} margin={{ left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef1f7" vertical={false} />
              <XAxis dataKey="nome" tick={{ fontSize: 10, fill: "#64749a" }} interval={0} angle={-20} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 11, fill: "#64749a" }} />
              <Tooltip contentStyle={tooltipStyle} labelFormatter={(_, p) => p?.[0]?.payload?.nomeCompleto} />
              <Bar dataKey="pendencias" radius={[6, 6, 0, 0]} fill="#b8760f" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="OS Planejadas x Concluídas" subtitle="Volume de trabalho por parada">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dados} margin={{ left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef1f7" vertical={false} />
              <XAxis dataKey="nome" tick={{ fontSize: 10, fill: "#64749a" }} interval={0} angle={-20} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 11, fill: "#64749a" }} />
              <Tooltip contentStyle={tooltipStyle} labelFormatter={(_, p) => p?.[0]?.payload?.nomeCompleto} />
              <Bar dataKey="osPlanejadas" name="Planejadas" radius={[6, 6, 0, 0]} fill="#b7cff0" />
              <Bar dataKey="osConcluidas" name="Concluídas" radius={[6, 6, 0, 0]} fill="#1b4d99" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
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
