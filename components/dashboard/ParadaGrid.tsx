"use client";

import { useEffect, useState } from "react";
import type { ParadaResumo } from "@/lib/types";
import { deleteCustomParada, getCustomParadasResumo } from "@/lib/local-store";
import { ParadaCard } from "./ParadaCard";

export function ParadaGrid({ estaticas }: { estaticas: ParadaResumo[] }) {
  const [customizadas, setCustomizadas] = useState<ParadaResumo[]>([]);

  useEffect(() => {
    setCustomizadas(getCustomParadasResumo());
  }, []);

  const handleDelete = (id: string) => {
    if (!window.confirm("Excluir este relatório? Essa ação não pode ser desfeita.")) return;
    deleteCustomParada(id);
    setCustomizadas((prev) => prev.filter((p) => p.id !== id));
  };

  const todas = [...customizadas, ...estaticas];

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {todas.map((parada, index) => {
        const isCustom = customizadas.some((c) => c.id === parada.id);
        return (
          <ParadaCard
            key={parada.id}
            parada={parada}
            index={index}
            custom={isCustom}
            onDelete={isCustom ? () => handleDelete(parada.id) : undefined}
          />
        );
      })}
    </div>
  );
}
