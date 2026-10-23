"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, BarChart3, CheckCircle2, ClipboardCheck, Clock3, Printer, Route, TrendingDown } from "lucide-react";
import type { ParadaCompleta } from "@/lib/types";
import { formatDate } from "@/lib/utils";

function horas(valor: number) {
  return `${Math.round(valor * 10) / 10}h`;
}

export function GestaoParada({ paradas }: { paradas: ParadaCompleta[] }) {
  const [id, setId] = useState(paradas[0]?.resumo.id ?? "");
  const parada = useMemo(() => paradas.find((item) => item.resumo.id === id) ?? paradas[0], [paradas, id]);

  if (!parada) return <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white py-20 text-center text-sm font-medium text-slate-400">Nenhuma parada disponível para análise.</div>;

  const criticos = [...parada.caminhoCritico].sort((a, b) => b.diferencaMin - a.diferencaMin);
  const atrasados = criticos.filter((item) => item.diferencaMin > 0);
  const pendencias = parada.pendencias;
  const naoFeitos = parada.servicos.filter((servico) => servico.naoFeitoCategoria);
  const desvioGeral = parada.resultadoFinal.tempoRealizadoHoras - parada.resultadoFinal.tempoPlanejadoHoras;

  return (
    <div className="space-y-8 print:space-y-5">
      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-brand-950 to-brand-800 p-6 text-white shadow-lg sm:p-8 print:bg-slate-950">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div><p className="label-tecnico text-[10px] font-bold text-brand-200">Administração · análise pós-parada</p><h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">Central de gestão da parada</h1><p className="mt-2 text-sm text-brand-100">Caminho crítico, desvios e pauta objetiva para reunião de encerramento.</p></div>
          <button type="button" onClick={() => window.print()} className="no-print inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-brand-800 hover:bg-brand-50"><Printer size={15} /> Imprimir pauta</button>
        </div>
        <select value={parada.resumo.id} onChange={(e) => setId(e.target.value)} className="no-print mt-7 w-full max-w-xl rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-bold text-white outline-none">
          {paradas.map((item) => <option key={item.resumo.id} value={item.resumo.id} className="text-slate-900">{item.resumo.nome} — {formatDate(item.resumo.data)}</option>)}
        </select>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Resumo label="Eficiência" valor={`${parada.kpis.eficiencia}%`} ok={parada.kpis.eficiencia === 100} />
        <Resumo label="Prazo da parada" valor={desvioGeral > 0 ? `+${horas(desvioGeral)}` : desvioGeral < 0 ? `${horas(desvioGeral)} de folga` : "No prazo"} alerta={desvioGeral > 0} />
        <Resumo label="Atividades críticas" valor={`${atrasados.length}/${criticos.length}`} alerta={atrasados.length > 0} />
        <Resumo label="Pendências abertas" valor={pendencias.length + naoFeitos.length} alerta={pendencias.length + naoFeitos.length > 0} />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <Cabecalho icon={Route} titulo="Caminho crítico e risco de atraso" descricao="As atividades que pressionam diretamente a data/hora de entrega." />
        {criticos.length ? <div className="divide-y divide-slate-100">{criticos.map((item) => {
          const risco = item.diferencaMin > 60 ? "Crítico" : item.diferencaMin > 0 ? "Atenção" : "Controlado";
          const cor = item.diferencaMin > 60 ? "bg-red-100 text-red-700" : item.diferencaMin > 0 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-700";
          return <div key={item.id} className="grid gap-2 px-5 py-4 sm:grid-cols-[1fr_auto_auto] sm:items-center"><div><p className="font-bold text-slate-800">{item.servico}</p><p className="text-xs text-slate-500">{item.inicioPlanejado}–{item.fimPlanejado} · responsável: {item.responsavel || "não informado"}{item.causaAtraso ? ` · ${item.causaAtraso}` : ""}</p></div><span className={`w-fit rounded-full px-2.5 py-1 text-[11px] font-extrabold ${cor}`}>{risco}</span><p className={`text-sm font-extrabold ${item.diferencaMin > 0 ? "text-red-600" : "text-emerald-700"}`}>{item.diferencaMin > 0 ? `+${item.diferencaMin} min` : "No prazo"}</p></div>;
        })}</div> : <Vazio texto="Este relatório não possui caminho crítico cadastrado." />}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <Cabecalho icon={BarChart3} titulo="Planejado × realizado" descricao="Desvio por etapa; mostra onde a parada consumiu mais tempo que o programado." />
        {parada.graficos.planejadoRealizado.length ? <div className="space-y-4 px-5 pb-6">{parada.graficos.planejadoRealizado.map((etapa) => {
          const teto = Math.max(etapa.planejado, etapa.realizado, 1); const percentual = Math.min((etapa.realizado / teto) * 100, 100); const excedeu = etapa.realizado > etapa.planejado;
          return <div key={etapa.etapa}><div className="mb-1.5 flex justify-between gap-3 text-sm"><span className="font-bold text-slate-700">{etapa.etapa}</span><span className={excedeu ? "font-bold text-red-600" : "font-bold text-emerald-700"}>Planejado {horas(etapa.planejado)} · Realizado {horas(etapa.realizado)}</span></div><div className="h-3 overflow-hidden rounded-full bg-slate-100"><div className={excedeu ? "h-full bg-red-500" : "h-full bg-emerald-500"} style={{ width: `${percentual}%` }} /></div></div>;
        })}</div> : <Vazio texto="Não há etapas planejadas/realizadas neste relatório." />}
      </section>

      <section className="rounded-2xl border border-brand-200 bg-brand-50/50 shadow-sm print:border-slate-300">
        <Cabecalho icon={ClipboardCheck} titulo="Pauta da reunião pós-parada" descricao="Resumo objetivo para registrar decisão, responsável e próxima ação." />
        <div className="grid gap-4 px-5 pb-6 lg:grid-cols-2"><Bloco titulo="Resultado e lições" itens={[parada.resultadoFinal.resumo, desvioGeral > 0 ? `A parada excedeu o plano em ${horas(desvioGeral)}.` : "A janela de parada foi respeitada.", atrasados.length ? `${atrasados.length} atividade(s) crítica(s) tiveram desvio.` : "Não houve atraso no caminho crítico."]} /><Bloco titulo="Ações necessárias" itens={[...pendencias.map((p) => `${p.item}: ${p.motivo}`), ...naoFeitos.map((s) => `OS ${s.numeroOS}: não feita — ${s.naoFeitoCategoria}${s.justificativaNaoFeito ? ` (${s.justificativaNaoFeito})` : ""}`)]} vazio="Nenhuma pendência ou OS não executada registrada." /></div>
      </section>
    </div>
  );
}

function Resumo({ label, valor, alerta, ok }: { label: string; valor: string | number; alerta?: boolean; ok?: boolean }) { return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p><p className={`mt-2 text-xl font-extrabold ${alerta ? "text-red-600" : ok ? "text-emerald-600" : "text-slate-900"}`}>{valor}</p></div>; }
function Cabecalho({ icon: Icon, titulo, descricao }: { icon: typeof Route; titulo: string; descricao: string }) { return <div className="flex gap-3 p-5"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-700"><Icon size={18} /></div><div><h2 className="text-base font-extrabold text-slate-900">{titulo}</h2><p className="text-xs font-medium text-slate-500">{descricao}</p></div></div>; }
function Vazio({ texto }: { texto: string }) { return <p className="px-5 pb-6 text-sm font-medium text-slate-400">{texto}</p>; }
function Bloco({ titulo, itens, vazio }: { titulo: string; itens: string[]; vazio?: string }) { return <div className="rounded-xl border border-slate-200 bg-white p-4"><h3 className="mb-3 text-sm font-extrabold text-slate-800">{titulo}</h3>{itens.length ? <ul className="space-y-2">{itens.map((item, i) => <li key={`${item}-${i}`} className="flex gap-2 text-sm text-slate-600"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />{item}</li>)}</ul> : <p className="text-sm font-medium text-emerald-700"><CheckCircle2 className="mr-1 inline" size={15} />{vazio}</p>}</div>; }
