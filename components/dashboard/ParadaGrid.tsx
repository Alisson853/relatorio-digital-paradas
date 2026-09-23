"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, SearchX } from "lucide-react";
import type { ParadaResumo, StatusGeral } from "@/lib/types";
import { clonarParada, deleteParada, getParadaCompleta } from "@/lib/actions/paradas";
import { triggerJsonDownload } from "@/lib/local-json";
import { cn, codigoMaquina } from "@/lib/utils";
import { ParadaCard } from "./ParadaCard";

const STATUS_FILTROS: Array<{ value: "todos" | StatusGeral; label: string }> = [
  { value: "todos", label: "Todos" },
  { value: "em_andamento", label: "Em Andamento" },
  { value: "concluida", label: "Concluída" },
  { value: "ressalvas", label: "Ressalvas" },
];

export function ParadaGrid({ paradas }: { paradas: ParadaResumo[] }) {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<"todos" | StatusGeral>("todos");
  const [maquinaFiltro, setMaquinaFiltro] = useState("todas");

  // Só vira aba a máquina que já tem relatório — nada de aba vazia. Com só
  // uma máquina no histórico, a aba "Todas" sozinha não ajudaria em nada,
  // então a fileira inteira some.
  const maquinas = useMemo(() => {
    const vistos = new Set<string>();
    paradas.forEach((p) => vistos.add(codigoMaquina(p.maquina)));
    return Array.from(vistos).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [paradas]);

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
      return bateBusca && bateStatus && bateMaquina;
    });
  }, [busca, statusFiltro, maquinaFiltro, paradas]);

  return (
    <div>
      {maquinas.length > 1 && (
        // Aba de máquina separada da fileira de busca/status, mais acima —
        // é o agrupamento principal (qual máquina), os outros dois filtram
        // dentro do que a aba já escolheu.
        <div className="no-scrollbar mb-4 flex gap-1.5 overflow-x-auto">
          <button
            onClick={() => setMaquinaFiltro("todas")}
            className={cn(
              "flex-none rounded-full border px-4 py-2 text-xs font-bold transition-colors",
              maquinaFiltro === "todas" ? "border-brand-600 bg-brand-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            )}
          >
            Todas as Máquinas
          </button>
          {maquinas.map((cod) => (
            <button
              key={cod}
              onClick={() => setMaquinaFiltro(cod)}
              className={cn(
                "flex-none rounded-full border px-4 py-2 text-xs font-bold transition-colors",
                maquinaFiltro === cod ? "border-brand-600 bg-brand-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              )}
            >
              {cod}
            </button>
          ))}
        </div>
      )}

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, máquina ou responsável"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 shadow-sm outline-none placeholder:text-slate-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
        </div>
        <div className="flex flex-none gap-1.5 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          {STATUS_FILTROS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFiltro(f.value)}
              className={cn(
                // Leva o chip de 28px para 36px de altura. A diretriz de toque
                // pede 44px, mas o chip vive numa fila horizontal de quatro:
                // 44 empurraria os ultimos para fora da tela do celular. 36 e
                // o maior que cabe sem quebrar a fila, e ja tira o alvo da
                // faixa em que o dedo erra.
                "flex-none rounded-lg px-3.5 py-2.5 text-xs font-bold transition-colors",
                statusFiltro === f.value ? "bg-brand-600 text-white" : "text-slate-500 hover:bg-slate-100"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filtradas.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 bg-white py-20 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <SearchX size={22} />
          </div>
          <p className="text-sm font-medium text-slate-400">Nenhuma parada encontrada com esses filtros.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
