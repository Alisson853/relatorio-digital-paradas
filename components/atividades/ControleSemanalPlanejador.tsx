"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, BarChart3, ClipboardCheck, Copy, UsersRound } from "lucide-react";

type Programacao = {
  id: string; os: string; executante: string; descricao: string; data: string;
  statusPlanilha: string; cancelado: boolean; oficina: string; tempoPrevistoMinutos: number;
};
type Lancamento = { programacaoId: string; minutos: number; status: string };

const normal = (valor: string) => valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();
const horas = (minutos: number) => `${(minutos / 60).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}h`;

export function ControleSemanalPlanejador({ programadas, lancamentos, inicio, fim }: { programadas: Programacao[]; lancamentos: Lancamento[]; inicio: string; fim: string }) {
  const [copiado, setCopiado] = useState(false);
  const dados = useMemo(() => {
    const ativas = programadas.filter((p) => !p.cancelado);
    const porId = new Map(lancamentos.map((l) => [l.programacaoId, l]));
    const planejado = ativas.reduce((soma, p) => soma + p.tempoPrevistoMinutos, 0);
    const realizado = lancamentos.reduce((soma, l) => soma + l.minutos, 0);
    const executadas = ativas.filter((p) => normal(porId.get(p.id)?.status ?? "") === "EXECUTADO").length;
    const naoExecutadas = ativas.filter((p) => normal(porId.get(p.id)?.status ?? "") === "NAO EXECUTADO").length;
    const semLancamento = ativas.filter((p) => !porId.has(p.id));
    const equipes = new Map<string, { itens: number; planejado: number; realizado: number; lancados: number }>();
    for (const p of ativas) {
      const chave = p.oficina.trim() || "Oficina não informada";
      const atual = equipes.get(chave) ?? { itens: 0, planejado: 0, realizado: 0, lancados: 0 };
      const l = porId.get(p.id);
      atual.itens += 1; atual.planejado += p.tempoPrevistoMinutos;
      if (l) { atual.realizado += l.minutos; atual.lancados += 1; }
      equipes.set(chave, atual);
    }
    const alertas = [
      ...ativas.filter((p) => !p.executante.trim()).map((p) => `OS ${p.os || "sem número"}: sem executante.`),
      ...ativas.filter((p) => p.tempoPrevistoMinutos <= 0).map((p) => `OS ${p.os || "sem número"}: sem tempo previsto.`),
      ...ativas.filter((p) => !p.data).map((p) => `OS ${p.os || "sem número"}: sem data.`),
    ];
    const excecoes = [
      ...programadas.filter((p) => p.cancelado).map((p) => ({ os: p.os, descricao: p.descricao, motivo: "Cancelada" })),
      ...programadas.filter((p) => normal(p.statusPlanilha) === "REPROGRAMADO").map((p) => ({ os: p.os, descricao: p.descricao, motivo: "Reprogramada" })),
      ...ativas.filter((p) => normal(porId.get(p.id)?.status ?? "") === "NAO EXECUTADO").map((p) => ({ os: p.os, descricao: p.descricao, motivo: "Não executada" })),
      ...semLancamento.map((p) => ({ os: p.os, descricao: p.descricao, motivo: "Sem lançamento" })),
    ];
    return { ativas, planejado, realizado, executadas, naoExecutadas, semLancamento, equipes: [...equipes.entries()], alertas, excecoes };
  }, [programadas, lancamentos]);

  const fechamento = `Fechamento semanal (${inicio.split("-").reverse().join("/")} a ${fim.split("-").reverse().join("/")})\nOS programadas: ${dados.ativas.length}\nExecutadas: ${dados.executadas}\nNão executadas: ${dados.naoExecutadas}\nSem lançamento: ${dados.semLancamento.length}\nHoras previstas: ${horas(dados.planejado)}\nHoras lançadas: ${horas(dados.realizado)}`;
  async function copiarResumo() { await navigator.clipboard.writeText(fechamento); setCopiado(true); window.setTimeout(() => setCopiado(false), 2500); }

  return <main className="bg-slate-50 px-4 pt-7 sm:px-8"><div className="mx-auto max-w-6xl"><p className="label-tecnico text-brand-600">Supervisor / Planejador</p><h1 className="mt-1 text-3xl font-bold text-slate-950">Controle semanal</h1><p className="mt-2 text-sm text-slate-500">Visão da programação de {inicio.split("-").reverse().join("/")} a {fim.split("-").reverse().join("/")}.</p><section className="mt-6 space-y-4" aria-label="Controle semanal do planejador">
    <div className="grid gap-4 lg:grid-cols-3">
      <article className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-2"><div className="flex items-center gap-2"><BarChart3 className="text-brand-600" /><div><h2 className="font-bold text-slate-900">Previsto x lançado</h2><p className="text-sm text-slate-500">Acompanhe a carga da semana em horas, sem misturar com as paradas.</p></div></div><div className="mt-5 grid gap-4 sm:grid-cols-3"><Metric label="Horas previstas" valor={horas(dados.planejado)} /><Metric label="Horas lançadas" valor={horas(dados.realizado)} /><Metric label="Cobertura" valor={dados.planejado ? `${Math.min(100, Math.round(dados.realizado / dados.planejado * 100))}%` : "—"} /></div><div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${dados.planejado ? Math.min(100, dados.realizado / dados.planejado * 100) : 0}%` }} /></div></article>
      <article className="rounded-2xl border border-brand-200 bg-brand-50 p-5"><div className="flex items-center gap-2"><ClipboardCheck className="text-brand-700" /><h2 className="font-bold text-slate-900">Fechamento semanal</h2></div><p className="mt-3 text-sm leading-6 text-slate-700">{dados.executadas} executadas · {dados.naoExecutadas} não executadas · {dados.semLancamento.length} sem lançamento.</p><button onClick={copiarResumo} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-700 px-3 text-sm font-bold text-white hover:bg-brand-800"><Copy size={16} />{copiado ? "Resumo copiado" : "Copiar resumo"}</button></article>
    </div>
    <div className="grid gap-4 lg:grid-cols-2">
      <article className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center gap-2"><UsersRound className="text-brand-600" /><div><h2 className="font-bold text-slate-900">Mapa de equipes</h2><p className="text-sm text-slate-500">Programação e horas por oficina.</p></div></div><div className="mt-4 overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="border-b text-xs uppercase tracking-wide text-slate-500"><tr><th className="p-2">Oficina</th><th className="p-2">OS</th><th className="p-2">Previsto</th><th className="p-2">Lançado</th></tr></thead><tbody>{dados.equipes.map(([nome, item]) => <tr key={nome} className="border-b border-slate-100"><td className="p-2 font-semibold text-slate-800">{nome}</td><td className="p-2">{item.lancados}/{item.itens}</td><td className="p-2">{horas(item.planejado)}</td><td className="p-2">{horas(item.realizado)}</td></tr>)}</tbody></table></div></article>
      <article className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center gap-2"><AlertTriangle className={dados.alertas.length ? "text-warning-700" : "text-success-700"} /><div><h2 className="font-bold text-slate-900">Conferência da programação</h2><p className="text-sm text-slate-500">Pendências para corrigir antes de cobrar os lançamentos.</p></div></div>{dados.alertas.length ? <ul className="mt-4 space-y-2 text-sm text-slate-700">{dados.alertas.slice(0, 6).map((alerta) => <li key={alerta} className="rounded-lg bg-warning-50 p-3">{alerta}</li>)}</ul> : <p className="mt-4 rounded-lg bg-success-50 p-3 text-sm font-semibold text-success-700">Programação conferida: não há OS sem executante, data ou tempo previsto.</p>}</article>
    </div>
    <article className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-bold text-slate-900">Exceções da semana</h2><p className="mt-1 text-sm text-slate-500">Reprogramadas, canceladas, não executadas ou sem lançamento.</p>{dados.excecoes.length ? <div className="mt-4 grid gap-2 sm:grid-cols-2">{dados.excecoes.slice(0, 12).map((item, indice) => <div key={`${item.os}-${item.motivo}-${indice}`} className="rounded-xl border border-slate-100 p-3 text-sm"><p className="font-bold text-slate-800">OS {item.os || "—"} <span className="font-medium text-slate-500">· {item.motivo}</span></p><p className="mt-1 truncate text-slate-500">{item.descricao || "Sem descrição"}</p></div>)}</div> : <p className="mt-4 rounded-lg bg-success-50 p-3 text-sm font-semibold text-success-700">Nenhuma exceção registrada nesta semana.</p>}</article>
  </section></div></main>;
}

function Metric({ label, valor }: { label: string; valor: string }) { return <div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold text-slate-950">{valor}</p></div>; }
