import {
  AlertTriangle,
  ArrowRightLeft,
  CheckCircle2,
  Clock,
  Flag,
  Gauge,
  HardHat,
  Lock,
  LucideIcon,
  MapPin,
  Play,
  Radar,
  Search,
  ShieldCheck,
  Timer,
  Unlock,
  Users,
  Users2,
  Wrench,
  ClipboardList,
} from "lucide-react";
import type { ParadaCompleta, Servico, TimelineEvento } from "@/lib/types";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { NO_PHOTO_PLACEHOLDER } from "@/lib/image-utils";
import { servicosComFoto } from "@/lib/derive";
import { cn, formatDate, statusLabel } from "@/lib/utils";

// Versão de impressão do relatório: nada aqui depende de animação, scroll ou
// IntersectionObserver — a árvore inteira fica com display:none até o navegador
// entrar em modo de impressão, então qualquer efeito baseado em "entrou na tela"
// (framer-motion whileInView, recharts ResponsiveContainer) nunca dispararia a
// tempo. Por isso essa versão usa markup estático simples, com os mesmos dados,
// e reaproveita a identidade visual da capa (fonte condensada, dados em mono,
// bloco técnico) para o relatório todo ficar coerente.

const TIMELINE_ICONS: Record<TimelineEvento["icone"], LucideIcon> = {
  flag: Flag,
  lock: Lock,
  wrench: Wrench,
  swap: ArrowRightLeft,
  search: Search,
  "check-circle": CheckCircle2,
  play: Play,
  unlock: Unlock,
};

function PrintPage({ children, className, dark }: { children: React.ReactNode; className?: string; dark?: boolean }) {
  return (
    <section className={cn("print-page relative flex min-h-[100vh] flex-col justify-center overflow-hidden px-16 py-12", className)}>
      <div className="pointer-events-none absolute inset-0 opacity-[0.05]" aria-hidden>
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(${dark ? "rgba(255,255,255,0.5)" : "rgba(10,30,63,0.5)"} 1px, transparent 1px), linear-gradient(90deg, ${dark ? "rgba(255,255,255,0.5)" : "rgba(10,30,63,0.5)"} 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
        />
      </div>
      <div className="relative">{children}</div>
    </section>
  );
}

function PageHeader({ eyebrow, title, dark }: { eyebrow: string; title: string; dark?: boolean }) {
  return (
    <div className="mb-8 flex items-stretch gap-4">
      <span className="mt-1 w-[3px] flex-none rounded-full bg-signal-500" />
      <div>
        <p className={cn("mb-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.28em]", dark ? "text-brand-300" : "text-brand-600")}>
          {eyebrow}
        </p>
        <h2 className={cn("font-display text-3xl font-semibold uppercase tracking-tight", dark ? "text-white" : "text-slate-900")}>{title}</h2>
      </div>
    </div>
  );
}

function PageFooter({ resumo, dark }: { resumo: ParadaCompleta["resumo"]; dark?: boolean }) {
  return (
    <div
      className={cn(
        "absolute inset-x-16 bottom-8 flex items-center justify-between border-t pt-3 font-mono text-[9px] uppercase tracking-[0.12em]",
        dark ? "border-white/15 text-brand-300" : "border-slate-200 text-slate-400"
      )}
    >
      <span>{resumo.nome}</span>
      <span>Santher — Relatório Digital</span>
    </div>
  );
}

function DataField({ label, value, mono = true, dark }: { label: string; value: string; mono?: boolean; dark?: boolean }) {
  return (
    <div className="min-w-0">
      <p className={cn("font-mono text-[9px] font-semibold uppercase tracking-[0.14em]", dark ? "text-brand-300" : "text-slate-400")}>{label}</p>
      <p className={cn("mt-0.5 truncate text-sm font-semibold", mono && "font-mono", dark ? "text-white" : "text-slate-800")}>{value}</p>
    </div>
  );
}

function CapaPage({ resumo }: { resumo: ParadaCompleta["resumo"] }) {
  const campos = [
    { label: "Data da Parada", value: formatDate(resumo.data) },
    { label: "Tempo Planejado", value: resumo.duracaoPlanejada },
    { label: "Tempo Realizado", value: resumo.duracaoRealizada },
    { label: "Responsável", value: resumo.responsavel },
  ];

  return (
    <PrintPage dark className="bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800 text-white">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/santher-logo-branco.png" alt="Santher" className="mb-14 h-10 w-auto" />

      <div className="grid grid-cols-[1.1fr_1fr] items-center gap-14">
        <div>
          <StatusBadge status={resumo.status} className="mb-6 w-fit rounded-sm border border-white/25 bg-white/[0.06] font-mono text-[11px] tracking-[0.08em] text-white [&>span]:bg-current" />
          <div className="flex items-stretch gap-4">
            <span className="mt-1 w-[3px] flex-none rounded-full bg-signal-500" />
            <div>
              <p className="mb-2 font-mono text-[11px] font-medium uppercase tracking-[0.32em] text-brand-300">{resumo.area} · Relatório Digital</p>
              <h1 className="font-display text-[2.6rem] font-semibold uppercase leading-[0.98] tracking-tight text-white">{resumo.nome}</h1>
              <p className="mt-4 text-lg font-medium text-brand-200">{resumo.maquina}</p>
            </div>
          </div>

          <div className="mt-10 grid grid-cols-2 overflow-hidden rounded-md border border-white/15 bg-white/[0.03]">
            {campos.map((c, i) => (
              <div key={c.label} className={cn("border-white/10 px-4 py-3.5", i % 2 === 1 && "border-l")}>
                <DataField label={c.label} value={c.value} dark />
              </div>
            ))}
          </div>
        </div>

        {resumo.fotosMaquina?.[0] ? (
          <div className="relative aspect-square w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={resumo.fotosMaquina[0]} alt={resumo.maquina} className="h-full w-full rounded-lg border border-white/20 object-cover" />
            <span className="absolute -bottom-px -left-px h-3 w-3 border-b-2 border-l-2 border-signal-500" />
            <span className="absolute -right-px -top-px h-3 w-3 border-r-2 border-t-2 border-signal-500" />
          </div>
        ) : null}
      </div>
    </PrintPage>
  );
}

const KPI_ICONS: Array<{ key: keyof ParadaCompleta["kpis"]; label: string; icon: LucideIcon; suffix?: string }> = [
  { key: "osPlanejadas", label: "OS Planejadas", icon: ClipboardList },
  { key: "osConcluidas", label: "OS Concluídas", icon: CheckCircle2 },
  { key: "eficiencia", label: "Eficiência", icon: Gauge, suffix: "%" },
  { key: "horasTrabalhadas", label: "Horas Trabalhadas", icon: Timer },
  { key: "equipeEletrica", label: "Equipe Elétrica", icon: Users },
  { key: "equipeMecanica", label: "Equipe Mecânica", icon: HardHat },
  { key: "equipeInstrumentacao", label: "Instrumentista", icon: Radar },
  { key: "seguranca", label: "Segurança", icon: ShieldCheck, suffix: "%" },
  { key: "pendencias", label: "Pendências", icon: AlertTriangle },
];

function ResumoPage({ data }: { data: ParadaCompleta }) {
  return (
    <PrintPage className="bg-white">
      <PageHeader eyebrow="Resumo Executivo" title="Indicadores Gerais da Parada" />
      <div className="grid grid-cols-3 gap-4">
        {KPI_ICONS.map(({ key, label, icon: Icon, suffix }) => (
          <div key={key} className="rounded-xl border border-slate-200 p-5">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <Icon size={18} />
            </div>
            <p className="text-3xl font-bold tracking-tight text-slate-900">
              {data.kpis[key]}
              {suffix}
            </p>
            <p className="mt-1 text-sm font-medium text-slate-500">{label}</p>
          </div>
        ))}
      </div>
      <PageFooter resumo={data.resumo} />
    </PrintPage>
  );
}

function TimelinePage({ data }: { data: ParadaCompleta }) {
  if (data.timeline.length === 0) return null;
  return (
    <PrintPage className="bg-white">
      <PageHeader eyebrow="Cronologia da Parada" title="Linha do Tempo" />
      <div className="relative pl-1">
        <div className="absolute bottom-2 left-[19px] top-2 w-px bg-slate-200" aria-hidden />
        <ol className="space-y-3">
          {data.timeline.map((evento) => {
            const Icon = TIMELINE_ICONS[evento.icone];
            return (
              <li key={evento.id} className="relative flex items-start gap-4">
                <div className="relative z-10 flex h-10 w-10 flex-none items-center justify-center rounded-full border-2 border-white bg-brand-50 text-brand-600 ring-1 ring-slate-200">
                  <Icon size={16} />
                </div>
                <div className="flex flex-1 items-start justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <p className="font-mono text-xs font-bold text-brand-600">{evento.horario}</p>
                    <p className="mt-0.5 text-sm font-bold text-slate-900">{evento.titulo}</p>
                    <p className="mt-0.5 max-w-xl text-xs leading-relaxed text-slate-500">{evento.descricao}</p>
                    <p className="mt-1 text-[10px] font-semibold text-slate-400">Responsável: {evento.responsavel}</p>
                  </div>
                  <StatusBadge status={evento.status} className="text-[10px]" />
                </div>
              </li>
            );
          })}
        </ol>
      </div>
      <PageFooter resumo={data.resumo} />
    </PrintPage>
  );
}

function ServicoField({ label, value, icon: Icon, className }: { label: string; value: string; icon?: LucideIcon; className?: string }) {
  return (
    <div className={cn("flex items-start gap-1.5", className)}>
      {Icon && <Icon size={12} className="mt-4 flex-none text-slate-400" />}
      <div className="min-w-0">
        <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
        <p className="mt-0.5 break-words text-sm font-semibold text-slate-800">{value}</p>
      </div>
    </div>
  );
}

function ServicoPage({ data, servico, indice, total }: { data: ParadaCompleta; servico: Servico; indice: number; total: number }) {
  const fotos = [
    ...(servico.fotoAntes && servico.fotoAntes !== NO_PHOTO_PLACEHOLDER ? [{ key: "antes", url: servico.fotoAntes, label: "Antes" }] : []),
    ...(servico.fotoDurante ? [{ key: "durante", url: servico.fotoDurante, label: "Durante" }] : []),
    ...(servico.fotoDepois && servico.fotoDepois !== NO_PHOTO_PLACEHOLDER ? [{ key: "depois", url: servico.fotoDepois, label: "Depois" }] : []),
  ];
  const mostrarRotulo = fotos.length > 1;

  return (
    <PrintPage className="bg-white">
      <div className="grid grid-cols-2 gap-12">
        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-brand-600">
              Serviços Executados · {indice}/{total}
            </span>
            <StatusBadge status={servico.status} />
          </div>
          <h3 className="font-display text-2xl font-semibold uppercase leading-tight tracking-tight text-slate-900">{servico.titulo}</h3>

          <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <ServicoField label="OS" value={servico.numeroOS} />
            <ServicoField label="Tempo Total" value={servico.tempoGasto} icon={Clock} />
            <ServicoField label="Equipamento" value={servico.equipamento} className="col-span-2" />
            <ServicoField label="Local" value={servico.area} icon={MapPin} />
            <ServicoField label="Área Responsável" value={`${servico.equipe} · ${servico.responsavel}`} icon={Users2} />
          </div>

          <div className="mt-5 space-y-3 text-sm">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-brand-600">Problema Identificado</p>
              <p className="mt-1 leading-relaxed text-slate-600">{servico.problemaIdentificado}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-brand-600">O Que Foi Feito</p>
              <p className="mt-1 leading-relaxed text-slate-600">{servico.servicoExecutado}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-brand-600">Resultado</p>
              <p className="mt-1 leading-relaxed text-slate-600">{servico.resultado}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-center gap-3 rounded-xl border-2 border-brand-100 bg-brand-50/40 p-3">
          {fotos.length === 0 ? (
            <div className="flex aspect-[4/3] items-center justify-center rounded-lg border border-dashed border-slate-300 text-sm text-slate-400">Sem foto</div>
          ) : (
            fotos.map((foto) => (
              <div key={foto.key} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={foto.url} alt={servico.equipamento} className="aspect-[16/11] w-full rounded-lg border-2 border-white object-cover shadow" />
                {mostrarRotulo && (
                  <span className="absolute left-2.5 top-2.5 rounded-full bg-slate-900/80 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    {foto.label}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
      <PageFooter resumo={data.resumo} />
    </PrintPage>
  );
}

function GaleriaPage({ data, fotos }: { data: ParadaCompleta; fotos: ParadaCompleta["fotos"] }) {
  if (fotos.length === 0) return null;
  return (
    <PrintPage className="bg-white">
      <PageHeader eyebrow="Registro Fotográfico" title="Galeria Antes, Durante & Depois" />
      <div className="grid grid-cols-5 gap-3">
        {fotos.map((foto) => (
          <div key={foto.id} className="relative aspect-square overflow-hidden rounded-lg bg-slate-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={foto.url} alt={foto.servico} className="h-full w-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5">
              <p className="truncate text-[9px] font-semibold text-white">{foto.servico}</p>
            </div>
          </div>
        ))}
      </div>
      <PageFooter resumo={data.resumo} />
    </PrintPage>
  );
}

function BarraSimples({ label, valor, max, color = "bg-brand-600" }: { label: string; valor: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.round((valor / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <p className="w-28 flex-none truncate text-xs font-semibold text-slate-600">{label}</p>
      <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${pct}%` }} />
      </div>
      <p className="w-10 flex-none text-right text-xs font-bold text-slate-700">{valor}</p>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 p-5">
      <h3 className="mb-4 text-sm font-bold text-slate-900">{title}</h3>
      {children}
    </div>
  );
}

function GraficosPage({ data }: { data: ParadaCompleta }) {
  const { graficos } = data;
  const maxEquipe = Math.max(1, ...graficos.osPorEquipe.map((d) => d.quantidade));
  const maxHoras = Math.max(1, ...graficos.horasPorSetor.map((d) => d.horas));
  const maxCategoria = Math.max(1, ...graficos.distribuicaoServicos.map((d) => d.valor));

  return (
    <PrintPage className="bg-slate-50">
      <PageHeader eyebrow="Indicadores Visuais" title="Gráficos de Desempenho" />
      <div className="grid grid-cols-2 gap-5">
        <ChartCard title="OS por Equipe">
          <div className="space-y-2.5">
            {graficos.osPorEquipe.map((d) => (
              <BarraSimples key={d.equipe} label={d.equipe} valor={d.quantidade} max={maxEquipe} />
            ))}
          </div>
        </ChartCard>
        <ChartCard title="Horas por Setor">
          <div className="space-y-2.5">
            {graficos.horasPorSetor.map((d) => (
              <BarraSimples key={d.setor} label={d.setor} valor={d.horas} max={maxHoras} color="bg-brand-400" />
            ))}
          </div>
        </ChartCard>
        <ChartCard title="Distribuição dos Serviços">
          <div className="space-y-2.5">
            {graficos.distribuicaoServicos.map((d) => (
              <BarraSimples key={d.categoria} label={d.categoria} valor={d.valor} max={maxCategoria} color="bg-brand-300" />
            ))}
          </div>
        </ChartCard>
        <div className="flex flex-col items-center justify-center rounded-xl border border-brand-700 bg-gradient-to-br from-brand-800 to-brand-900 p-5 text-center text-white">
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-brand-200">Percentual Concluído</p>
          <p className="mt-2 font-display text-5xl font-semibold">{graficos.percentualConcluido}%</p>
        </div>
      </div>
      <PageFooter resumo={data.resumo} />
    </PrintPage>
  );
}

function CaminhoCriticoPage({ data }: { data: ParadaCompleta }) {
  const itens = data.caminhoCritico;
  if (itens.length === 0) return null;
  return (
    <PrintPage className="bg-white">
      <PageHeader eyebrow="Cronograma Crítico" title="Caminho Crítico" />
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="bg-slate-900 text-[10px] font-bold uppercase tracking-wide text-slate-300">
            <th className="rounded-l-md py-2.5 pl-3 pr-3">Serviço</th>
            <th className="px-3 py-2.5">Início Planej.</th>
            <th className="px-3 py-2.5">Fim Planej.</th>
            <th className="px-3 py-2.5">Início Real</th>
            <th className="px-3 py-2.5">Fim Real</th>
            <th className="px-3 py-2.5">Diferença</th>
            <th className="px-3 py-2.5">Responsável</th>
            <th className="rounded-r-md py-2.5 pl-3 pr-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {itens.map((item, i) => (
            <tr key={item.id} className={i % 2 === 1 ? "bg-slate-50" : undefined}>
              <td className="py-2.5 pl-3 pr-3 font-semibold text-slate-800">{item.servico}</td>
              <td className="px-3 py-2.5 font-mono text-slate-500">{item.inicioPlanejado}</td>
              <td className="px-3 py-2.5 font-mono text-slate-500">{item.fimPlanejado}</td>
              <td className="px-3 py-2.5 font-mono text-slate-500">{item.inicioReal}</td>
              <td className="px-3 py-2.5 font-mono text-slate-500">{item.fimReal}</td>
              <td
                className={cn(
                  "px-3 py-2.5 font-bold",
                  item.diferencaMin > 60 ? "text-danger-600" : item.diferencaMin > 0 ? "text-warning-600" : "text-success-600"
                )}
              >
                {item.diferencaMin === 0 ? "No prazo" : `+${item.diferencaMin} min`}
              </td>
              <td className="px-3 py-2.5 text-slate-600">{item.responsavel}</td>
              <td className="py-2.5 pl-3 pr-3">{statusLabel(item.status)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <PageFooter resumo={data.resumo} />
    </PrintPage>
  );
}

function ResultadoPage({ data }: { data: ParadaCompleta }) {
  const { resultadoFinal: resultado, pendencias } = data;
  const sucesso = resultado.selo === "concluida";
  const ressalvas = resultado.selo === "ressalvas";
  const titulo = sucesso ? "PARADA CONCLUÍDA COM SUCESSO" : ressalvas ? "PARADA CONCLUÍDA COM RESSALVAS" : "PARADA EM ANDAMENTO";
  const indicadores = [
    { label: "Tempo Planejado", value: `${resultado.tempoPlanejadoHoras}h`, icon: Timer },
    { label: "Tempo Realizado", value: `${resultado.tempoRealizadoHoras}h`, icon: Timer },
    { label: "Eficiência", value: `${resultado.eficiencia}%`, icon: Gauge },
    { label: "Disponibilidade", value: `${resultado.disponibilidade}%`, icon: CheckCircle2 },
    { label: "Pendências", value: String(resultado.pendenciasAbertas), icon: AlertTriangle },
  ];

  return (
    <PrintPage dark className="bg-gradient-to-br from-brand-950 via-brand-900 to-slate-950 text-center text-white">
      <p className="mb-4 font-mono text-xs font-bold uppercase tracking-[0.28em] text-brand-200">Resultado Final</p>
      <div
        className={cn(
          "mx-auto mb-10 flex max-w-xl flex-col items-center gap-3 rounded-2xl border-2 px-8 py-8",
          sucesso ? "border-success-600/40 bg-success-600/10" : ressalvas ? "border-warning-600/40 bg-warning-600/10" : "border-brand-400/40 bg-brand-500/10"
        )}
      >
        <div className={cn("flex h-14 w-14 items-center justify-center rounded-full", sucesso ? "bg-success-600" : ressalvas ? "bg-warning-600" : "bg-brand-500")}>
          {sucesso ? <CheckCircle2 size={28} className="text-white" /> : <ShieldCheck size={28} className="text-white" />}
        </div>
        <h2 className="font-display text-2xl font-semibold uppercase tracking-tight">{titulo}</h2>
        <p className="max-w-md text-sm leading-relaxed text-brand-100">{resultado.resumo}</p>
      </div>

      <div className="mx-auto grid max-w-3xl grid-cols-5 gap-3">
        {indicadores.map((ind) => (
          <div key={ind.label} className="rounded-xl border border-white/10 bg-white/5 p-4">
            <ind.icon size={16} className="mx-auto mb-2 text-brand-200" />
            <p className="text-2xl font-bold">{ind.value}</p>
            <p className="mt-1 text-[9px] font-semibold uppercase tracking-wide text-brand-300">{ind.label}</p>
          </div>
        ))}
      </div>

      {pendencias.length > 0 && (
        <div className="mx-auto mt-8 max-w-2xl rounded-xl border border-white/10 bg-white/5 p-6 text-left">
          <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-warning-100">
            <AlertTriangle size={14} />O Que Não Foi Feito
          </p>
          <ul className="space-y-2">
            {pendencias.map((p) => (
              <li key={p.id} className="text-sm">
                <span className="font-bold text-white">{p.item}</span> <span className="text-brand-200">— {p.motivo}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </PrintPage>
  );
}

export function PrintReport({ data }: { data: ParadaCompleta }) {
  return (
    <div className="hidden print:block">
      <CapaPage resumo={data.resumo} />
      <ResumoPage data={data} />
      <TimelinePage data={data} />
      {servicosComFoto(data.servicos).map((s, i) => (
        <ServicoPage key={s.id} data={data} servico={s} indice={i + 1} total={servicosComFoto(data.servicos).length} />
      ))}
      <GaleriaPage data={data} fotos={data.fotos} />
      <GraficosPage data={data} />
      <CaminhoCriticoPage data={data} />
      <ResultadoPage data={data} />
    </div>
  );
}
