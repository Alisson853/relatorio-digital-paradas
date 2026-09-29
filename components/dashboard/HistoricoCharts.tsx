"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ClipboardList, Clock, Gauge, SlidersHorizontal, type LucideIcon } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ParadaHistoricoItem } from "@/lib/actions/paradas";
import type { HistoricoNaoFeitoItem } from "@/lib/historico-nao-feito";
import { MOTIVOS_NAO_FEITO, type Equipe } from "@/lib/types";
import { cn, codigoMaquina, formatDate, formatDateCompact, formatIdadeRelativa } from "@/lib/utils";
import { exportarCsv, exportarXlsx } from "@/lib/export-tabular";
import { filtrarPorMaquinaEPeriodo } from "@/lib/historico-filtro";
import { StatusBadge } from "@/components/ui/StatusBadge";

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

const LINHAS_POR_PAGINA = 10;

const ACENTOS_ESTAT = {
  brand: { texto: "text-brand-600", fundo: "bg-brand-50" },
  success: { texto: "text-success-600", fundo: "bg-success-100" },
  warning: { texto: "text-warning-600", fundo: "bg-warning-100" },
} as const;

// Sem caixa própria (sem border/rounded/bg): a divisão vem do pai — uma
// única faixa com divide-x/divide-y — não mais quatro cartões idênticos
// lado a lado repetindo a mesma forma quatro vezes.
function EstatisticaResumo({
  label,
  value,
  icon: Icon,
  acento,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  acento: keyof typeof ACENTOS_ESTAT;
}) {
  const cores = ACENTOS_ESTAT[acento];
  return (
    <div className="flex items-center gap-3 p-4">
      <div className={cn("flex h-9 w-9 flex-none items-center justify-center rounded-lg", cores.fundo, cores.texto)}>
        <Icon size={17} strokeWidth={2.2} />
      </div>
      <div className="min-w-0">
        <p className="text-xl font-bold leading-none text-slate-900">{value}</p>
        <p className="mt-1 truncate text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      </div>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
  extra,
  heightClass = "h-64",
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  extra?: React.ReactNode;
  heightClass?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">{title}</h3>
          <p className="text-xs font-medium text-slate-400">{subtitle}</p>
        </div>
        {extra}
      </div>
      <div className={cn("mt-4", heightClass)}>{children}</div>
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
// os relatórios (já filtrados por máquina/período) — é o que mostra se o
// problema é sempre o mesmo (ex: falta de material se repetindo) em vez de
// casos isolados e diferentes entre si.
function GraficoMotivosNaoFeito({ historicoNaoFeito }: { historicoNaoFeito: HistoricoNaoFeitoItem[] }) {
  const dados = MOTIVOS_NAO_FEITO.map((categoria) => ({
    categoria,
    quantidade: historicoNaoFeito.filter((h) => h.categoria === categoria).length,
  })).filter((d) => d.quantidade > 0);

  if (dados.length === 0) return null;

  return (
    <ChartCard title="Motivos de Não Feito" subtitle="Somando os relatórios filtrados">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={dados} layout="vertical" margin={{ left: 24 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef1f7" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11, fill: "#64749a" }} allowDecimals={false} />
          <YAxis type="category" dataKey="categoria" tick={{ fontSize: 11, fill: "#64749a" }} width={132} />
          <Tooltip contentStyle={tooltipStyle} />
          {/* #c23a2f = --danger-600, o mesmo vermelho usado no resto do app
              (StatusBadge, botões destrutivos) — antes era um vermelho solto
              (#c0392b) que não vinha de token nenhum da marca. */}
          <Bar dataKey="quantidade" name="Ocorrências" radius={[0, 6, 6, 0]} fill="#c23a2f" />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// Comparação lado a lado de duas paradas específicas — a pergunta que o
// gráfico agregado não responde de cara ("essa foi melhor ou pior que a
// anterior?"). Usa só indicadores que o sistema já calcula (kpis, porEquipe);
// não inventa métrica nova, e não é um gráfico — é uma tabela pequena, de
// propósito, pra não virar mais uma visualização pra manter.
function ComparacaoParadas({ itens }: { itens: ParadaHistoricoItem[] }) {
  const opcoes = useMemo(() => [...itens].reverse(), [itens]); // mais recente primeiro, no <select>
  // Guarda só a ESCOLHA explícita do usuário — o padrão (as duas paradas mais
  // recentes do conjunto filtrado) é calculado na hora de renderizar, não
  // sincronizado via efeito. Isso evita o cascading render de setState dentro
  // de useEffect, e também corrige sozinho quando o filtro muda e a escolha
  // anterior não existe mais no conjunto (cai de volta no padrão, em vez de
  // apontar pra uma parada que sumiu do filtro).
  const [idASelecionado, setIdASelecionado] = useState<string | null>(null);
  const [idBSelecionado, setIdBSelecionado] = useState<string | null>(null);

  if (itens.length < 2) return null;

  const idAValido = idASelecionado && opcoes.some((o) => o.resumo.id === idASelecionado);
  const idBValido = idBSelecionado && opcoes.some((o) => o.resumo.id === idBSelecionado);
  const idA = idAValido ? idASelecionado : (opcoes[1]?.resumo.id ?? opcoes[0].resumo.id);
  const idB = idBValido ? idBSelecionado : opcoes[0].resumo.id;

  const paradaA = itens.find((i) => i.resumo.id === idA);
  const paradaB = itens.find((i) => i.resumo.id === idB);

  const linhas: Array<{ rotulo: string; a: string | number; b: string | number }> = paradaA && paradaB
    ? [
        { rotulo: "Data", a: formatDate(paradaA.resumo.data), b: formatDate(paradaB.resumo.data) },
        { rotulo: "Eficiência", a: `${paradaA.kpis.eficiencia}%`, b: `${paradaB.kpis.eficiencia}%` },
        { rotulo: "Horas trabalhadas", a: paradaA.kpis.horasTrabalhadas, b: paradaB.kpis.horasTrabalhadas },
        { rotulo: "OS planejadas", a: paradaA.kpis.osPlanejadas, b: paradaB.kpis.osPlanejadas },
        { rotulo: "OS concluídas", a: paradaA.kpis.osConcluidas, b: paradaB.kpis.osConcluidas },
        { rotulo: "Pendências", a: paradaA.kpis.pendencias, b: paradaB.kpis.pendencias },
      ]
    : [];

  const equipesComparadas = paradaA && paradaB
    ? EQUIPE_ORDEM.filter((eq) => paradaA.porEquipe.some((e) => e.equipe === eq) || paradaB.porEquipe.some((e) => e.equipe === eq))
    : [];

  function horasDaEquipe(item: ParadaHistoricoItem, equipe: Equipe): number {
    return item.porEquipe.find((e) => e.equipe === equipe)?.horas ?? 0;
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-sm font-bold text-slate-900">Comparar Duas Paradas</h3>
      <p className="mb-4 text-xs font-medium text-slate-400">Coloca os indicadores de duas paradas lado a lado.</p>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <select
          value={idA}
          onChange={(e) => setIdASelecionado(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        >
          {opcoes.map((o) => (
            <option key={o.resumo.id} value={o.resumo.id}>
              {o.resumo.nome} — {formatDate(o.resumo.data)}
            </option>
          ))}
        </select>
        <select
          value={idB}
          onChange={(e) => setIdBSelecionado(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        >
          {opcoes.map((o) => (
            <option key={o.resumo.id} value={o.resumo.id}>
              {o.resumo.nome} — {formatDate(o.resumo.data)}
            </option>
          ))}
        </select>
      </div>

      {paradaA && paradaB && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-sm">
            <thead className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
              <tr>
                <th className="py-2 pr-3">Indicador</th>
                <th className="py-2 pr-3">A</th>
                <th className="py-2">B</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {linhas.map((l) => (
                <tr key={l.rotulo}>
                  <td className="py-2 pr-3 font-semibold text-slate-600">{l.rotulo}</td>
                  <td className="py-2 pr-3 text-slate-800">{l.a}</td>
                  <td className="py-2 text-slate-800">{l.b}</td>
                </tr>
              ))}
              {equipesComparadas.map((eq) => (
                <tr key={eq}>
                  <td className="py-2 pr-3 text-slate-500">Horas — {eq}</td>
                  <td className="py-2 pr-3 text-slate-800">{horasDaEquipe(paradaA, eq)}h</td>
                  <td className="py-2 text-slate-800">{horasDaEquipe(paradaB, eq)}h</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function HistoricoCharts({ itens, historicoNaoFeito }: { itens: ParadaHistoricoItem[]; historicoNaoFeito: HistoricoNaoFeitoItem[] }) {
  const [maquinaFiltro, setMaquinaFiltro] = useState("todas");
  const [dataDe, setDataDe] = useState("");
  const [dataAte, setDataAte] = useState("");
  const [linhasVisiveis, setLinhasVisiveis] = useState(LINHAS_POR_PAGINA);

  // Só vira chip a máquina que já tem parada no histórico — mesmo raciocínio
  // do filtro por máquina do dashboard (ParadaGrid).
  const maquinas = useMemo(() => {
    const vistos = new Set<string>();
    itens.forEach((i) => vistos.add(codigoMaquina(i.resumo.maquina)));
    return Array.from(vistos).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [itens]);

  // Filtra em cima do que a página já carregou (uma leitura só) — com o
  // volume atual de relatórios isso é melhor pra quem usa (filtro responde na
  // hora, sem esperar rede) do que trazer o filtro pro banco. Ver nota no
  // relatório do bloco sobre o motivo de não ter virado uma consulta paginada.
  const itensFiltrados = useMemo(() => {
    return filtrarPorMaquinaEPeriodo(itens, { maquina: maquinaFiltro, dataDe, dataAte });
  }, [itens, maquinaFiltro, dataDe, dataAte]);

  const historicoNaoFeitoFiltrado = useMemo(() => {
    const idsFiltrados = new Set(itensFiltrados.map((i) => i.resumo.id));
    return historicoNaoFeito.filter((h) => idsFiltrados.has(h.paradaId));
  }, [historicoNaoFeito, itensFiltrados]);

  // Muda o filtro, some a paginação acumulada — senão "carregar mais" fica
  // travado num número que não faz sentido pro novo conjunto. Ajustado durante
  // a renderização (padrão recomendado pelo React pra "resetar estado quando
  // algo muda"), não dentro de um useEffect — evita o cascading render de um
  // setState síncrono dentro de efeito.
  const filtroAssinatura = `${maquinaFiltro}|${dataDe}|${dataAte}`;
  const [ultimaAssinaturaFiltro, setUltimaAssinaturaFiltro] = useState(filtroAssinatura);
  if (filtroAssinatura !== ultimaAssinaturaFiltro) {
    setUltimaAssinaturaFiltro(filtroAssinatura);
    setLinhasVisiveis(LINHAS_POR_PAGINA);
  }

  if (itens.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 bg-white py-20 text-center">
        <p className="text-sm font-medium text-slate-400">Nenhum relatório cadastrado ainda.</p>
      </div>
    );
  }

  const dados = itensFiltrados.map((item) => ({
    // Nomes de relatório se repetem entre paradas (ex: várias "Relatório
    // Preventiva MP09") — a data é o que realmente distingue uma barra da
    // outra nos gráficos, então é ela que vai no eixo, não o nome truncado.
    dataLabel: formatDateCompact(item.resumo.data),
    nomeCompleto: item.resumo.nome,
    data: formatDate(item.resumo.data),
    dataIso: item.resumo.data,
    maquina: item.resumo.maquina,
    status: item.resumo.status,
    responsavel: item.resumo.responsavel,
    eficiencia: item.kpis.eficiencia,
    horasTrabalhadas: item.kpis.horasTrabalhadas,
    pendencias: item.kpis.pendencias,
    osPlanejadas: item.kpis.osPlanejadas,
    osConcluidas: item.kpis.osConcluidas,
    id: item.resumo.id,
  }));

  const mediaEficiencia = dados.length ? Math.round((dados.reduce((sum, d) => sum + d.eficiencia, 0) / dados.length) * 10) / 10 : 0;
  const totalPendencias = dados.reduce((sum, d) => sum + d.pendencias, 0);

  const dadosTabela = [...dados].reverse(); // mais recente primeiro
  const visiveis = dadosTabela.slice(0, linhasVisiveis);
  const temMais = linhasVisiveis < dadosTabela.length;

  function exportar(formato: "csv" | "xlsx") {
    const colunas = ["Parada", "Máquina", "Data", "Responsável", "Eficiência (%)", "Horas Trabalhadas", "Pendências"];
    // Exporta TODAS as linhas que batem no filtro, não só as visíveis na
    // tela — "carregar mais" é só uma questão de rolagem, não é um filtro.
    const linhas = dadosTabela.map((d) => [d.nomeCompleto, d.maquina, d.data, d.responsavel || "—", d.eficiencia, d.horasTrabalhadas, d.pendencias]);
    const nomeArquivo = `historico-paradas.${formato}`;
    if (formato === "csv") exportarCsv(nomeArquivo, colunas, linhas);
    else exportarXlsx(nomeArquivo, colunas, linhas, "Histórico");
  }

  return (
    <div className="space-y-8">
      {/* Barra de filtro em vez de card — só uma regra por baixo separando do
          resto, não mais uma caixa com borda/sombra igual às de gráfico logo
          abaixo. É a primeira etapa do fluxo (filtrar → resumir → detalhar),
          então lê como um controle fixo, não mais um bloco de conteúdo. */}
      <div className="border-b border-slate-200 pb-5">
        <div className="label-tecnico mb-3 flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
          <SlidersHorizontal size={12} />
          Filtros
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        {maquinas.length > 1 && (
          <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
            <button
              type="button"
              onClick={() => setMaquinaFiltro("todas")}
              className={cn(
                "flex-none rounded-full border px-3.5 py-2 text-xs font-bold transition-colors",
                maquinaFiltro === "todas" ? "border-brand-600 bg-brand-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              )}
            >
              Todas as Máquinas
            </button>
            {maquinas.map((cod) => (
              <button
                key={cod}
                type="button"
                onClick={() => setMaquinaFiltro(cod)}
                className={cn(
                  "flex-none rounded-full border px-3.5 py-2 text-xs font-bold transition-colors",
                  maquinaFiltro === cod ? "border-brand-600 bg-brand-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                )}
              >
                {cod}
              </button>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500 sm:ml-auto">
          <span className="text-slate-400">Período</span>
          {/* Os dois campos de data num grupo só (borda comum, sem separação
              entre eles) em vez de dois inputs soltos — lê como um único
              controle "de → até", não dois filtros independentes. */}
          <div className="flex items-center overflow-hidden rounded-lg border border-slate-200 bg-white">
            <input
              type="date"
              value={dataDe}
              onChange={(e) => setDataDe(e.target.value)}
              aria-label="De"
              className="px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:bg-brand-50"
            />
            <span className="text-slate-300">→</span>
            <input
              type="date"
              value={dataAte}
              onChange={(e) => setDataAte(e.target.value)}
              aria-label="Até"
              className="px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:bg-brand-50"
            />
          </div>
          {(dataDe || dataAte || maquinaFiltro !== "todas") && (
            <button
              type="button"
              onClick={() => {
                setDataDe("");
                setDataAte("");
                setMaquinaFiltro("todas");
              }}
              className="rounded-lg px-2 py-1.5 text-xs font-bold text-brand-600 hover:bg-brand-50"
            >
              Limpar filtros
            </button>
          )}
        </div>
        </div>
      </div>

      {itensFiltrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 bg-white py-16 text-center">
          <p className="text-sm font-medium text-slate-400">Nenhuma parada encontrada com esses filtros.</p>
        </div>
      ) : (
        <>
          {/* Faixa única dividida (divide-x/divide-y) em vez de quatro
              cartões idênticos lado a lado — a mesma forma repetida quatro
              vezes era exatamente o "card pra tudo" que o redesenho pediu
              pra cortar. Uma faixa só, com regras internas, lê como um
              painel de resumo — não quatro blocos concorrendo por atenção. */}
          <div className="grid grid-cols-2 divide-x divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white sm:grid-cols-4 sm:divide-y-0">
            <EstatisticaResumo label="Paradas no filtro" value={dados.length} icon={ClipboardList} acento="brand" />
            <EstatisticaResumo label="Eficiência média" value={`${mediaEficiencia}%`} icon={Gauge} acento="success" />
            <EstatisticaResumo label="Horas trabalhadas" value={dados.reduce((sum, d) => sum + d.horasTrabalhadas, 0)} icon={Clock} acento="brand" />
            <EstatisticaResumo label="Pendências (total)" value={totalPendencias} icon={AlertTriangle} acento="warning" />
          </div>

          {/* Eficiência isolada como gráfico "âncora", maior e sozinha na
              linha — é o indicador que mais interessa numa comparação entre
              paradas. Os outros quatro, todos do mesmo peso entre si, vêm
              depois numa grade menor — composição assimétrica em vez de uma
              grade só, uniforme, com seis blocos idênticos. */}
          <ChartCard title="Eficiência ao Longo do Tempo" subtitle="Percentual concluído por parada" heightClass="h-72 sm:h-80">
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

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
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
                  {/* Duas séries com cores parecidas (dois tons de azul) sem
                      legenda obrigava passar o mouse pra saber qual barra é
                      qual — a legenda deixa isso visível sem interação. */}
                  <Legend wrapperStyle={{ fontSize: 11, fontWeight: 600, color: "#64749a" }} iconType="circle" iconSize={8} />
                  <Bar dataKey="osPlanejadas" name="Planejadas" radius={[6, 6, 0, 0]} fill="#b7cff0" />
                  <Bar dataKey="osConcluidas" name="Concluídas" radius={[6, 6, 0, 0]} fill="#1b4d99" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <div className="lg:col-span-2">
              <GraficoPorEquipe itens={itensFiltrados} />
            </div>

            <GraficoMotivosNaoFeito historicoNaoFeito={historicoNaoFeitoFiltrado} />
          </div>

          <ComparacaoParadas itens={itensFiltrados} />

          {/* Painel de registros: borda superior mais grossa (mesma cor de
              marca) em vez de shadow-sm igual aos gráficos — é aqui que está
              o dado bruto por trás de todo o resto da tela, e o acento
              marca essa diferença de papel, não só mais um card na fileira. */}
          <div className="overflow-hidden rounded-2xl border border-t-4 border-slate-200 border-t-brand-600 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div>
                <p className="label-tecnico text-[10px] font-bold text-brand-500">Registros</p>
                <p className="mt-0.5 text-xs font-semibold text-slate-500">
                  {dadosTabela.length} parada{dadosTabela.length === 1 ? "" : "s"} no filtro
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => exportar("csv")}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Exportar CSV
                </button>
                <button
                  type="button"
                  onClick={() => exportar("xlsx")}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Exportar Excel
                </button>
              </div>
            </div>
            {/* No celular a tabela vira lista de cards — rolar uma tabela de
                lado pra ler é uma leitura de cada vez, célula por célula; o
                card mostra tudo de uma parada junto, na ordem que importa
                pra quem está decidindo se precisa abrir aquele relatório:
                nome, máquina e status primeiro, pendências em destaque
                quando existem, o resto como contexto. */}
            <div className="divide-y divide-slate-100 sm:hidden">
              {visiveis.map((d) => (
                <Link key={d.id} href={`/parada/${d.id}`} className="block px-4 py-3.5 active:bg-slate-50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900">{d.nomeCompleto}</p>
                      <p className="mt-0.5 text-xs font-bold text-brand-600">{d.maquina}</p>
                    </div>
                    <StatusBadge status={d.status} className="flex-none" />
                  </div>

                  {d.responsavel && (
                    <p className="mt-2 text-xs font-semibold text-slate-600">{d.responsavel}</p>
                  )}

                  <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span>
                      {d.data} <span className="text-slate-400">({formatIdadeRelativa(d.dataIso)})</span>
                    </span>
                    <span>
                      <strong className="font-bold text-slate-800">{d.eficiencia}%</strong> eficiência
                    </span>
                    <span>
                      <strong className="font-bold text-slate-800">{d.horasTrabalhadas}h</strong> trabalhadas
                    </span>
                  </div>

                  {d.pendencias > 0 && (
                    <span className="mt-2.5 inline-flex items-center gap-1 rounded-full bg-warning-100 px-2.5 py-1 text-xs font-bold text-warning-600">
                      {d.pendencias} pendência{d.pendencias === 1 ? "" : "s"} — {formatIdadeRelativa(d.dataIso)}
                    </span>
                  )}
                </Link>
              ))}
            </div>

            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b-2 border-slate-100 bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-5 py-3">Parada</th>
                    <th className="px-5 py-3">Máquina</th>
                    {/* Faltava na tabela — só os cards do celular mostravam
                        status. É a primeira coisa que qualquer linha "diz"
                        antes de qualquer número. */}
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Responsável</th>
                    <th className="px-5 py-3">Data</th>
                    <th className="px-5 py-3">Eficiência</th>
                    <th className="px-5 py-3">Horas</th>
                    <th className="px-5 py-3">Pendências</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visiveis.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3 font-semibold text-slate-800">
                        <Link href={`/parada/${d.id}`} className="hover:text-brand-600 hover:underline">
                          {d.nomeCompleto}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-slate-500">{d.maquina}</td>
                      <td className="px-5 py-3">
                        <StatusBadge status={d.status} />
                      </td>
                      <td className="px-5 py-3 text-slate-500">{d.responsavel || "—"}</td>
                      <td className="px-5 py-3 text-slate-500">
                        {d.data}
                        <span className="ml-1.5 text-xs text-slate-400">({formatIdadeRelativa(d.dataIso)})</span>
                      </td>
                      <td className="px-5 py-3 font-semibold text-slate-800">{d.eficiencia}%</td>
                      <td className="px-5 py-3 text-slate-500">{d.horasTrabalhadas}h</td>
                      <td className="px-5 py-3">
                        {d.pendencias > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-warning-100 px-2 py-0.5 text-xs font-bold text-warning-600">
                            {d.pendencias} — {formatIdadeRelativa(d.dataIso)}
                          </span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {temMais && (
              <div className="border-t border-slate-100 px-5 py-3 text-center">
                <button
                  type="button"
                  onClick={() => setLinhasVisiveis((n) => n + LINHAS_POR_PAGINA)}
                  className="rounded-lg px-4 py-2 text-xs font-bold text-brand-600 hover:bg-brand-50"
                >
                  Carregar mais ({dadosTabela.length - visiveis.length} restantes)
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
