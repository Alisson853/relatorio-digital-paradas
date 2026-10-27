"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ScrollText, Search, SearchX } from "lucide-react";
import type { ParadaResumo, StatusGeral } from "@/lib/types";
import { clonarParada, deleteParada, getParadaCompleta } from "@/lib/actions/paradas";
import { triggerJsonDownload } from "@/lib/local-json";
import { useEditorMode } from "@/lib/useEditorMode";
import { cn, codigoMaquina } from "@/lib/utils";
import { ParadaCard } from "./ParadaCard";

const STATUS_FILTROS: Array<{ value: "todos" | StatusGeral; label: string }> = [
  { value: "todos", label: "Todos" },
  { value: "em_andamento", label: "Em Andamento" },
  { value: "concluida", label: "Concluída" },
  { value: "ressalvas", label: "Ressalvas" },
];

const FOCO = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600";

export function ParadaGrid({ paradas }: { paradas: ParadaResumo[] }) {
  const router = useRouter();
  const { isEditor } = useEditorMode();
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<"todos" | StatusGeral>("todos");
  const [maquinaFiltro, setMaquinaFiltro] = useState(() => {
    if (typeof window === "undefined") return "todas";
    return new URLSearchParams(window.location.search).get("maquina")?.toUpperCase() || "todas";
  });
  const [dataDe, setDataDe] = useState("");
  const [dataAte, setDataAte] = useState("");

  // Só vira aba a máquina que já tem relatório — nada de aba vazia. Com só
  // uma máquina no histórico, a aba "Todas" sozinha não ajudaria em nada,
  // então a fileira inteira some.
  const maquinas = useMemo(() => {
    const vistos = new Set<string>();
    paradas.forEach((p) => vistos.add(codigoMaquina(p.maquina)));
    return Array.from(vistos).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [paradas]);

  const contagemPorStatus = useMemo(() => {
    const contagem: Record<string, number> = { todos: paradas.length };
    paradas.forEach((parada) => {
      contagem[parada.status] = (contagem[parada.status] ?? 0) + 1;
    });
    return contagem;
  }, [paradas]);

  // Escolher uma aba também atualiza a URL — assim o link da tela (pra
  // favoritar, mandar por WhatsApp, ou virar QR code) sempre reflete o que
  // está sendo mostrado, sem precisar de uma página separada por máquina.
  function selecionarMaquina(cod: string) {
    setMaquinaFiltro(cod);
    const url = new URL(window.location.href);
    if (cod === "todas") url.searchParams.delete("maquina");
    else url.searchParams.set("maquina", cod);
    router.replace(`${url.pathname}${url.search}`, { scroll: false });
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm("Excluir este relatório? Essa ação não pode ser desfeita.")) return;
    const resultado = await deleteParada(id);
    if (!resultado.ok) {
      window.alert(resultado.erro || "Não foi possível excluir.");
      return;
    }
    router.refresh();
  };

  const handleExport = async (id: string) => {
    const completa = await getParadaCompleta(id);
    if (completa) triggerJsonDownload(`relatorio-${completa.resumo.id}.json`, completa);
  };

  const handleClone = async (id: string) => {
    if (!window.confirm("Clonar este relatório como modelo para uma nova parada? Fotos e status serão zerados.")) return;
    const resultado = await clonarParada(id);
    if (!resultado.ok || !resultado.novoId) {
      window.alert(resultado.erro || "Não foi possível clonar.");
      return;
    }
    router.push(`/novo?edit=${resultado.novoId}`);
  };

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return paradas.filter((p) => {
      const bateBusca = !termo || [p.nome, p.maquina, p.area, p.responsavel].some((campo) => campo.toLowerCase().includes(termo));
      const bateStatus = statusFiltro === "todos" || p.status === statusFiltro;
      const bateMaquina = maquinaFiltro === "todas" || codigoMaquina(p.maquina) === maquinaFiltro;
      return bateBusca && bateStatus && bateMaquina && (!dataDe || p.data >= dataDe) && (!dataAte || p.data <= dataAte);
    });
  }, [busca, statusFiltro, maquinaFiltro, dataDe, dataAte, paradas]);

  const temFiltroAtivo = busca !== "" || statusFiltro !== "todos" || maquinaFiltro !== "todas" || dataDe !== "" || dataAte !== "";

  function limparFiltros() {
    setBusca("");
    setStatusFiltro("todos");
    setDataDe("");
    setDataAte("");
    selecionarMaquina("todas");
  }

  return (
    <div>
      {maquinas.length > 1 && (
        // Aba de máquina separada da fileira de busca/status, mais acima —
        // é o agrupamento principal (qual máquina), os outros dois filtram
        // dentro do que a aba já escolheu.
        <div role="group" aria-label="Filtrar por máquina" className="no-scrollbar -mx-4 mb-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <button
            type="button"
            aria-pressed={maquinaFiltro === "todas"}
            onClick={() => selecionarMaquina("todas")}
            className={cn(
              "min-h-11 flex-none rounded-full border px-4 text-xs font-bold transition-colors",
              FOCO,
              maquinaFiltro === "todas" ? "border-brand-600 bg-brand-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            )}
          >
            Todas as Máquinas
          </button>
          {maquinas.map((cod) => (
            <div
              key={cod}
              className={cn(
                "flex flex-none items-stretch overflow-hidden rounded-full border transition-colors",
                maquinaFiltro === cod ? "border-brand-600 bg-brand-600" : "border-slate-200 bg-white"
              )}
            >
              <button
                type="button"
                aria-pressed={maquinaFiltro === cod}
                onClick={() => selecionarMaquina(cod)}
                className={cn("min-h-11 px-4 text-xs font-bold", FOCO, maquinaFiltro === cod ? "text-white" : "text-slate-600 hover:bg-slate-50")}
              >
                {cod}
              </button>
              {isEditor && (
                <a
                  href={`/api/export/rtf/maquina/${cod}`}
                  title={`Baixar RTF com o QR code de ${cod} (colar no Mantec)`}
                  aria-label={`Baixar RTF com o QR code de ${cod}`}
                  className={cn(
                    "flex min-w-11 items-center justify-center border-l transition-colors",
                    FOCO,
                    maquinaFiltro === cod ? "border-white/25 text-white/80 hover:bg-brand-700" : "border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                  )}
                >
                  <ScrollText size={14} aria-hidden="true" />
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search size={16} aria-hidden="true" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="search"
            aria-label="Buscar paradas"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, máquina ou responsável"
            className="min-h-11 w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 shadow-sm outline-none placeholder:text-slate-500 focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-white p-2 text-xs font-semibold text-slate-600 sm:flex">
          <label className="flex items-center gap-1">De <input type="date" value={dataDe} onChange={(e) => setDataDe(e.target.value)} className={cn("min-h-9 min-w-0 flex-1 rounded bg-transparent", FOCO)} /></label>
          <label className="flex items-center gap-1 border-l border-slate-200 pl-2">Até <input type="date" value={dataAte} onChange={(e) => setDataAte(e.target.value)} className={cn("min-h-9 min-w-0 flex-1 rounded bg-transparent", FOCO)} /></label>
        </div>
        <div role="group" aria-label="Filtrar por status" className="no-scrollbar flex flex-none gap-1.5 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          {STATUS_FILTROS.map((f) => {
            const ativo = statusFiltro === f.value;
            return (
            <button
              type="button"
              key={f.value}
              aria-pressed={ativo}
              onClick={() => setStatusFiltro(f.value)}
              className={cn(
                "inline-flex min-h-10 flex-none items-center gap-1.5 rounded-lg px-3.5 text-xs font-bold transition-colors",
                FOCO,
                ativo ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-100"
              )}
            >
              {f.label}
              <span className={cn("rounded-full px-1.5 py-px text-[10px] tabular-nums", ativo ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600")}>{contagemPorStatus[f.value] ?? 0}</span>
            </button>
            );
          })}
        </div>
      </div>

      <div className="mb-5 flex min-h-6 items-center justify-between gap-3">
        <p role="status" aria-live="polite" className="text-xs font-semibold text-slate-600">{filtradas.length} de {paradas.length} parada(s)</p>
        {temFiltroAtivo && <button type="button" onClick={limparFiltros} className={cn("min-h-8 rounded px-2 text-xs font-bold text-brand-600 hover:text-brand-700", FOCO)}>Limpar filtros</button>}
      </div>

      {filtradas.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 bg-white px-4 py-16 text-center sm:py-20">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
            <SearchX size={22} aria-hidden="true" />
          </div>
          <p className="text-sm font-medium text-slate-600">Nenhuma parada encontrada com esses filtros.</p>
          {temFiltroAtivo && <button type="button" onClick={limparFiltros} className={cn("min-h-10 rounded-lg px-3 text-sm font-bold text-brand-600 hover:text-brand-700", FOCO)}>Limpar filtros</button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {filtradas.map((parada, index) => (
            <ParadaCard
              key={parada.id}
              parada={parada}
              index={index}
              onDelete={() => handleDelete(parada.id)}
              onExport={() => handleExport(parada.id)}
              onClone={() => handleClone(parada.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
