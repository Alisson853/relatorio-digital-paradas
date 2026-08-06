"use client";

import { Trash2 } from "lucide-react";
import type { StatusItem } from "@/lib/types";
import { NumberField, SelectField, TextField } from "./FormControls";

export interface CaminhoRow {
  id: string;
  servico: string;
  inicioPlanejado: string;
  fimPlanejado: string;
  inicioReal: string;
  fimReal: string;
  diferencaMin: number;
  responsavel: string;
  status: StatusItem;
  causaAtraso: string;
}

const STATUS_OPTIONS = [
  { value: "concluido", label: "Concluído" },
  { value: "em_andamento", label: "Em Andamento" },
  { value: "pendente", label: "Pendente" },
  { value: "atrasado", label: "Atrasado" },
];

interface Props {
  item: CaminhoRow;
  index: number;
  onChange: (patch: Partial<CaminhoRow>) => void;
  onRemove: () => void;
}

export function CaminhoRowEditor({ item, index, onChange, onRemove }: Props) {
  return (
    <div className="relative rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remover atividade"
        className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-danger-100 hover:text-danger-600"
      >
        <Trash2 size={14} />
      </button>
      <p className="mb-3 text-xs font-bold text-brand-600">Atividade {index + 1}</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <TextField label="Serviço" value={item.servico} onChange={(v) => onChange({ servico: v })} className="col-span-2 sm:col-span-2" />
        <TextField label="Responsável" value={item.responsavel} onChange={(v) => onChange({ responsavel: v })} className="col-span-2 sm:col-span-2" />
        <TextField label="Início Planej." type="time" value={item.inicioPlanejado} onChange={(v) => onChange({ inicioPlanejado: v })} />
        <TextField label="Fim Planej." type="time" value={item.fimPlanejado} onChange={(v) => onChange({ fimPlanejado: v })} />
        <TextField label="Início Real" type="time" value={item.inicioReal} onChange={(v) => onChange({ inicioReal: v })} />
        <TextField label="Fim Real" type="time" value={item.fimReal} onChange={(v) => onChange({ fimReal: v })} />
        <NumberField label="Diferença (min)" value={item.diferencaMin} onChange={(v) => onChange({ diferencaMin: v })} />
        <SelectField label="Status" value={item.status} onChange={(v) => onChange({ status: v as StatusItem })} options={STATUS_OPTIONS} />
        <TextField
          label="Causa do Atraso (se houver)"
          value={item.causaAtraso}
          onChange={(v) => onChange({ causaAtraso: v })}
          placeholder="Ex: Falta de Material"
          className="col-span-2"
        />
      </div>
    </div>
  );
}
