"use client";

import { useEffect, useState } from "react";
import type { ParadaResumo } from "@/lib/types";
import { getCustomParadasResumo } from "@/lib/local-store";

export function DashboardStats({ estaticas }: { estaticas: ParadaResumo[] }) {
  const [customizadas, setCustomizadas] = useState<ParadaResumo[]>([]);

  useEffect(() => {
    setCustomizadas(getCustomParadasResumo());
  }, []);

  const todas = [...customizadas, ...estaticas];
  const total = todas.length;
  const concluidas = todas.filter((p) => p.status === "concluida").length;
  const ativas = todas.filter((p) => p.status !== "concluida").length;

  return (
    <div className="grid grid-cols-3 gap-3 sm:min-w-[380px]">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
        <p className="text-2xl font-bold text-slate-900">{total}</p>
        <p className="mt-0.5 text-xs font-medium text-slate-400">Paradas</p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
        <p className="text-2xl font-bold text-success-600">{concluidas}</p>
        <p className="mt-0.5 text-xs font-medium text-slate-400">Concluídas</p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
        <p className="text-2xl font-bold text-warning-600">{ativas}</p>
        <p className="mt-0.5 text-xs font-medium text-slate-400">Ativas</p>
      </div>
    </div>
  );
}
