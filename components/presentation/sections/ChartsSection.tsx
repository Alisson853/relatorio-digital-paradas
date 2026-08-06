"use client";

import { motion } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  ComposedChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { GraficosData } from "@/lib/types";
import { SectionHeading } from "@/components/ui/SectionHeading";

const BRAND = ["#1b4d99", "#4a83d4", "#7fabe5", "#0f2a56", "#b7cff0"];
const PIE_COLORS = ["#1b4d99", "#4a83d4", "#7fabe5", "#b7cff0"];

function ChartCard({ title, subtitle, children, index }: { title: string; subtitle?: string; children: React.ReactNode; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10% 0px" }}
      transition={{ duration: 0.5, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      {subtitle && <p className="text-xs font-medium text-slate-400">{subtitle}</p>}
      <div className="mt-4 h-64">{children}</div>
    </motion.div>
  );
}

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid #dbe2ee",
  boxShadow: "0 4px 12px rgba(16,24,40,0.08)",
  fontSize: 12,
  fontWeight: 600,
};

export function ChartsSection({ graficos }: { graficos: GraficosData }) {
  return (
    <section id="graficos" className="section-screen flex items-center bg-slate-50 px-6 py-24 sm:px-10">
      <div className="mx-auto w-full max-w-7xl">
        <SectionHeading
          eyebrow="Indicadores Visuais"
          title="Gráficos de Desempenho"
          description="Análise consolidada de mão de obra, tempo, materiais e aderência ao planejamento."
        />

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          <ChartCard title="OS por Equipe" subtitle="Quantidade de ordens executadas" index={0}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={graficos.osPorEquipe} margin={{ left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef1f7" vertical={false} />
                <XAxis dataKey="equipe" tick={{ fontSize: 11, fill: "#64749a" }} interval={0} angle={-20} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 11, fill: "#64749a" }} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#f0f6fd" }} />
                <Bar dataKey="quantidade" radius={[6, 6, 0, 0]}>
                  {graficos.osPorEquipe.map((_, i) => (
                    <Cell key={i} fill={BRAND[i % BRAND.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Horas por Setor" subtitle="Distribuição de horas de mão de obra" index={1}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={graficos.horasPorSetor} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef1f7" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#64749a" }} />
                <YAxis dataKey="setor" type="category" width={110} tick={{ fontSize: 11, fill: "#64749a" }} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#f0f6fd" }} />
                <Bar dataKey="horas" radius={[0, 6, 6, 0]} fill="#4a83d4" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Distribuição dos Serviços" subtitle="Percentual por categoria" index={2}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={graficos.distribuicaoServicos} dataKey="valor" nameKey="categoria" innerRadius={55} outerRadius={85} paddingAngle={3}>
                  {graficos.distribuicaoServicos.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="white" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11, fontWeight: 600 }} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Pareto de Atrasos" subtitle="Horas perdidas por causa raiz" index={3}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={graficos.paretoAtrasos} margin={{ left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef1f7" vertical={false} />
                <XAxis dataKey="causa" tick={{ fontSize: 10, fill: "#64749a" }} interval={0} angle={-20} textAnchor="end" height={50} />
                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "#64749a" }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "#64749a" }} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#f0f6fd" }} />
                <Bar yAxisId="left" dataKey="horas" fill="#1b4d99" radius={[6, 6, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="acumulado" stroke="#c23a2f" strokeWidth={2.5} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Planejado x Realizado" subtitle="Horas por etapa da parada" index={4}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={graficos.planejadoRealizado} margin={{ left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef1f7" vertical={false} />
                <XAxis dataKey="etapa" tick={{ fontSize: 10, fill: "#64749a" }} interval={0} angle={-20} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 11, fill: "#64749a" }} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#f0f6fd" }} />
                <Legend wrapperStyle={{ fontSize: 11, fontWeight: 600 }} />
                <Bar dataKey="planejado" name="Planejado" fill="#b7cff0" radius={[6, 6, 0, 0]} />
                <Bar dataKey="realizado" name="Realizado" fill="#1b4d99" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-10% 0px" }}
            transition={{ duration: 0.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center justify-center rounded-2xl border border-brand-700 bg-gradient-to-br from-brand-800 to-brand-900 p-6 text-center text-white shadow-sm"
          >
            <p className="text-xs font-bold uppercase tracking-widest text-brand-200">Percentual Concluído</p>
            <p className="mt-2 text-6xl font-bold tracking-tight">{graficos.percentualConcluido}%</p>
            <div className="mt-4 h-2 w-full max-w-[180px] overflow-hidden rounded-full bg-white/15">
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: `${graficos.percentualConcluido}%` }}
                viewport={{ once: true }}
                transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                className="h-full rounded-full bg-white"
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
