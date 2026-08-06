"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, SearchX } from "lucide-react";
import type { ParadaResumo, StatusGeral } from "@/lib/types";
import { deleteCustomParada, downloadParadaJson, getCustomParadaById, getCustomParadasResumo } from "@/lib/local-store";
import { cn } from "@/lib/utils";
import { ParadaCard } from "./ParadaCard";

const STATUS_FILTROS: Array<{ value: "todos" | StatusGeral; label: string }> = [
  { value: "todos", label: "Todos" },
  { value: "em_andamento", label: "Em Andamento" },
  { value: "concluida", label: "Concluída" },
  { value: "ressalvas", label: "Ressalvas" },
];

export function ParadaGrid({ estaticas }: { estaticas: ParadaResumo[] }) {
  const [customizadas, setCustomizadas] = useState<ParadaResumo[]>([]);
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<"todos" | StatusGeral>("todos");

  useEffect(() => {
    setCustomizadas(getCustomParadasResumo());
  }, []);

  const handleDelete = (id: string) => {
    if (!window.confirm("Excluir este relatório? Essa ação não pode ser desfeita.")) return;
    deleteCustomParada(id);
    setCustomizadas((prev) => prev.filter((p) => p.id !== id));
  };

  const handleExport = (id: string) => {
    const completa = getCustomParadaById(id);
    if (completa) downloadParadaJson(completa);
  };

  const todas = [...customizadas, ...estaticas];

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return todas.filter((p) => {
      const bateBusca = !termo || [p.nome, p.maquina, p.area, p.responsavel].some((campo) => campo.toLowerCase().includes(termo));
      const bateStatus = statusFiltro === "todos" || p.status === statusFiltro;
      return bateBusca && bateStatus;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca, statusFiltro, customizadas, estaticas]);

  return (
    <div>
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
                "flex-none rounded-lg px-3 py-1.5 text-xs font-bold transition-colors",
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
          {filtradas.map((parada, index) => {
            const isCustom = customizadas.some((c) => c.id === parada.id);
            return (
              <ParadaCard
                key={parada.id}
                parada={parada}
                index={index}
                custom={isCustom}
                onDelete={isCustom ? () => handleDelete(parada.id) : undefined}
                onExport={isCustom ? () => handleExport(parada.id) : undefined}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
