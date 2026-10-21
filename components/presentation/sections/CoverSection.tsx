"use client";

import Image from "next/image";
import type { ParadaResumo } from "@/lib/types";
import { MachineIllustration } from "@/components/ui/MachineIllustration";
import { formatDateCompact } from "@/lib/utils";

export function CoverSection({ resumo, atividades }: { resumo: ParadaResumo; atividades: { planejadas: number; concluidas: number } }) {
  const comHoras = (duracao: string) => (/^\s*\d+([.,]\d+)?\s*$/.test(duracao) ? `${duracao.trim()}h` : duracao);
  const progresso = atividades.planejadas ? Math.round((atividades.concluidas / atividades.planejadas) * 100) : 0;
  const status = resumo.status === "concluida" ? "Parada concluída" : resumo.status === "ressalvas" ? "Com ressalvas" : "Parada em andamento";
  const campos = [
    { label: "Data da parada", value: formatDateCompact(resumo.data) },
    { label: "Tempo", value: comHoras(resumo.duracaoPlanejada) },
    { label: "Responsável", value: resumo.responsavel },
  ];

  return (
    <section id="capa" className="section-screen relative flex items-center overflow-hidden bg-brand-950 px-6 pb-16 pt-[calc(4rem+env(safe-area-inset-top))] sm:px-10 sm:py-20 lg:px-14 lg:py-20">
      <div className="pointer-events-none absolute inset-0 opacity-70" style={{ backgroundImage: "linear-gradient(rgba(107,173,250,0.11) 1px, transparent 1px), linear-gradient(90deg, rgba(107,173,250,0.11) 1px, transparent 1px)", backgroundSize: "72px 72px" }} />
      <div className="pointer-events-none absolute -right-32 -top-32 h-[520px] w-[520px] rounded-full bg-brand-500/15 blur-3xl" />
      <Image src="/santher-logo-branco.png" alt="Santher" width={190} height={48} className="absolute left-6 top-[calc(1.5rem+env(safe-area-inset-top))] h-10 w-auto sm:left-10 sm:top-10 sm:h-12" priority />

      <div className="relative mx-auto grid w-full max-w-[1340px] grid-cols-1 items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
        <div>
          <div className="revelar flex items-stretch gap-5" style={{ animationDelay: "0.1s" }}>
            <span className="mt-1 w-[5px] flex-none rounded-full bg-signal-500" />
            <div className="min-w-0">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.15em] text-brand-300 sm:tracking-[0.22em]">{resumo.area} / Unidade Guaíba</p>
              <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.1em] text-brand-300">Parada programada · Relatório executivo</p>
              <h1 className="mt-9 font-display text-[3rem] font-semibold uppercase leading-[0.95] tracking-tight text-white sm:text-6xl lg:text-[4.45rem]">{resumo.nome}</h1>
              <p className="mt-3 text-xl font-semibold text-brand-100">{resumo.maquina}</p>
            </div>
          </div>

          <div className="revelar mt-9 inline-flex items-center gap-3 rounded-2xl bg-brand-700 px-5 py-4" style={{ animationDelay: "0.2s" }}>
            <span className="h-2.5 w-2.5 rounded-full bg-signal-500" />
            <div>
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-brand-100">{status}</p>
              <p className="mt-1 text-xs font-semibold text-white">{formatDateCompact(resumo.data)} · {comHoras(resumo.duracaoPlanejada)} planejadas</p>
            </div>
          </div>

          <div className="revelar mt-8 grid overflow-hidden rounded-2xl border border-brand-400/40 bg-brand-900/90 sm:grid-cols-3" style={{ animationDelay: "0.3s" }}>
            {campos.map(({ label, value }, index) => (
              <div key={label} className={`min-w-0 px-5 py-5 align-top ${index > 0 ? "border-t border-brand-400/30 sm:border-l sm:border-t-0" : ""}`}>
                <p className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-brand-300">{label}</p>
                <p className="mt-2 text-base font-bold leading-snug text-white [overflow-wrap:anywhere]">{value}</p>
              </div>
            ))}
          </div>
          <p className="revelar mt-12 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-brand-300" style={{ animationDelay: "0.4s" }}>Relatório digital · Versão para apresentação</p>
        </div>

        <div className="revelar-foto relative aspect-[5/6] w-full max-w-[570px] justify-self-center rounded-[26px] border-2 border-signal-500/90 bg-brand-800 p-5" style={{ animationDelay: "0.3s" }}>
          {resumo.fotosMaquina?.length ? (
            <div className="relative h-full w-full overflow-hidden rounded-[18px] bg-brand-900 shadow-2xl">
              <Image src={resumo.fotosMaquina[0]} alt={resumo.maquina} fill sizes="(min-width: 1024px) 42vw, 94vw" className="object-cover object-center" priority />
              <div className="absolute inset-0 bg-gradient-to-t from-brand-950/80 via-brand-950/10 to-brand-950/30" />
            </div>
          ) : (
            <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-[18px] border border-white/15 bg-brand-900 p-12"><MachineIllustration variant={resumo.imagem} className="h-full w-full" /></div>
          )}
          <div className="absolute right-9 top-9 rounded-2xl bg-brand-950/95 px-5 py-4 shadow-xl backdrop-blur">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-brand-300">Atividades</p>
            <p className="mt-1 text-2xl font-bold text-white">{atividades.concluidas} / {atividades.planejadas}</p>
            <div className="mt-2 h-1.5 w-36 overflow-hidden rounded-full bg-brand-500"><div className="h-full rounded-full bg-signal-500" style={{ width: `${progresso}%` }} /></div>
            <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.08em] text-brand-100">{progresso}% concluído</p>
          </div>
          <div className="absolute bottom-9 left-9 rounded-lg bg-brand-950/85 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.1em] text-brand-100 backdrop-blur">Registro fotográfico · {resumo.maquina}</div>
        </div>
      </div>
    </section>
  );
}
