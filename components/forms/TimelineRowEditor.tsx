"use client";

import { Trash2 } from "lucide-react";
import type { StatusItem, TimelineEvento } from "@/lib/types";
import { SelectField, TextAreaField, TextField } from "./FormControls";

export interface TimelineRow {
  id: string;
  horario: string;
  titulo: string;
  responsavel: string;
  descricao: string;
  icone: TimelineEvento["icone"];
  status: StatusItem;
}

const ICONE_OPTIONS = [
  { value: "flag", label: "Início/Liberação" },
  { value: "lock", label: "Bloqueio (LOTO)" },
  { value: "wrench", label: "Manutenção" },
  { value: "swap", label: "Troca de Componente" },
  { value: "search", label: "Inspeção" },
  { value: "check-circle", label: "Testes" },
  { value: "play", label: "Partida" },
  { value: "unlock", label: "Remoção de Bloqueio" },
];

const STATUS_OPTIONS = [
  { value: "concluido", label: "Concluído" },
  { value: "em_andamento", label: "Em Andamento" },
  { value: "pendente", label: "Pendente" },
  { value: "atrasado", label: "Atrasado" },
];

interface Props {
  item: TimelineRow;
  index: number;
  onChange: (patch: Partial<TimelineRow>) => void;
  onRemove: () => void;
}

export function TimelineRowEditor({ item, index, onChange, onRemove }: Props) {
  return (
    <div className="relative rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remover evento"
        className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-danger-100 hover:text-danger-600"
      >
        <Trash2 size={14} />
      </button>
      <p className="mb-3 text-xs font-bold text-brand-600">Evento {index + 1}</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <TextField label="Horário" type="time" value={item.horario} onChange={(v) => onChange({ horario: v })} />
        <TextField label="Título" value={item.titulo} onChange={(v) => onChange({ titulo: v })} className="col-span-2 sm:col-span-1" />
        <TextField label="Responsável" value={item.responsavel} onChange={(v) => onChange({ responsavel: v })} />
        <SelectField label="Ícone" value={item.icone} onChange={(v) => onChange({ icone: v as TimelineEvento["icone"] })} options={ICONE_OPTIONS} />
        <SelectField
          label="Status"
          value={item.status}
          onChange={(v) => onChange({ status: v as StatusItem })}
          options={STATUS_OPTIONS}
          className="col-span-2 sm:col-span-1"
        />
        <TextAreaField label="Descrição" value={item.descricao} onChange={(v) => onChange({ descricao: v })} rows={2} className="col-span-2 sm:col-span-4" />
      </div>
    </div>
  );
}

export { ICONE_OPTIONS as TIMELINE_ICONE_OPTIONS, STATUS_OPTIONS as TIMELINE_STATUS_OPTIONS };
