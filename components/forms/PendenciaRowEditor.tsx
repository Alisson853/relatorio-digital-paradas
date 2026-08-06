"use client";

import { Trash2 } from "lucide-react";
import { TextField } from "./FormControls";

export interface PendenciaRow {
  id: string;
  item: string;
  motivo: string;
}

interface Props {
  item: PendenciaRow;
  onChange: (patch: Partial<PendenciaRow>) => void;
  onRemove: () => void;
}

export function PendenciaRowEditor({ item, onChange, onRemove }: Props) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
        <TextField label="O Que Não Foi Feito" value={item.item} onChange={(v) => onChange({ item: v })} placeholder="Ex: Troca do rolamento X" />
        <TextField label="Motivo" value={item.motivo} onChange={(v) => onChange({ motivo: v })} placeholder="Ex: Peça não chegou a tempo" />
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remover pendência"
        className="mt-6 flex h-7 w-7 flex-none items-center justify-center rounded-full text-slate-400 hover:bg-danger-100 hover:text-danger-600"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
