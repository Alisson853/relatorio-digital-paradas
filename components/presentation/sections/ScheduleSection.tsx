"use client";

import { AlertTriangle, Clock3, Route } from "lucide-react";
import { candidatasCriticas, detectarConflitosProgramacao, formatarHorario, servicosProgramados } from "@/lib/programacao";
import type { Servico } from "@/lib/types";

export function ScheduleSection({ servicos }: { servicos: Servico[] }) {
  const programados = servicosProgramados(servicos);
  const conflitos = detectarConflitosProgramacao(servicos);
  const criticas = candidatasCriticas(servicos);
  if (programados.length === 0) return null;
  const inicio = Math.min(...programados.map((s) => s.inicioMinutos));
  const fim = Math.max(...programados.map((s) => s.fimMinutos));
  const duracao = Math.max(fim - inicio, 30);
  return (
    <section id="cronograma" className="scroll-mt-8 px-5 py-14 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-600">Planejamento</p>
        <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">Cronograma por equipe</h2>
        <p className="mt-2 text-sm text-slate-600">Janela programada: {formatarHorario(inicio)} — {formatarHorario(fim)}. Barras mostram o horário previsto de cada atividade.</p>
        {conflitos.length > 0 && <div className="mt-5 rounded-2xl border border-warning-200 bg-warning-50 p-4 text-sm text-warning-900"><div className="flex gap-2 font-bold"><AlertTriangle size={17} /> {conflitos.length} conflito{conflitos.length === 1 ? "" : "s"} de programação</div><ul className="mt-2 space-y-1 pl-6">{conflitos.map((c, i) => <li key={`${c.chave}-${i}`}>{c.tipo === "responsavel" ? `Responsável ${c.chave}` : `Equipe ${c.chave}`} em atividades sobrepostas: {c.servicos[0].numeroOS} e {c.servicos[1].numeroOS}.</li>)}</ul></div>}
        <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex min-w-[640px] justify-between text-xs font-bold text-slate-500"><span>{formatarHorario(inicio)}</span><span>{formatarHorario(fim)}</span></div>
          <div className="min-w-[640px] space-y-3">{programados.map((s) => { const left = ((s.inicioMinutos - inicio) / duracao) * 100; const width = Math.max(((s.fimMinutos - s.inicioMinutos) / duracao) * 100, 3); const critica = criticas.some((c) => c.id === s.id); return <div key={s.id} className="grid grid-cols-[150px_1fr] items-center gap-3"><div className="truncate text-xs"><b>{s.equipe}</b><br /><span className="text-slate-500">OS {s.numeroOS}</span></div><div className="relative h-9 rounded-lg bg-slate-100"><div className={`absolute top-0.5 h-8 rounded-md px-2 pt-2 text-[10px] font-bold text-white ${critica ? "bg-danger-600" : "bg-brand-600"}`} style={{ left: `${left}%`, width: `${width}%` }} title={`${s.equipamento}: ${s.horaInicio} — ${s.horaFim}`}>{s.horaInicio}—{s.horaFim}</div></div></div>; })}</div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-slate-100 p-4 text-sm text-slate-700"><Clock3 size={17} className="mb-1 text-brand-600" /> {programados.length} atividades com horário definido.</div><div className="rounded-xl bg-danger-50 p-4 text-sm text-danger-800"><Route size={17} className="mb-1" /> {criticas.length} candidata{criticas.length === 1 ? "" : "s"} crítica{criticas.length === 1 ? "" : "s"}: atividade que termina por último na equipe. Para caminho crítico completo, cadastre dependências no painel Caminho Crítico.</div></div>
      </div>
    </section>
  );
}
