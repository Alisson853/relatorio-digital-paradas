"use client";

import { Copy, Trash2 } from "lucide-react";
import type { Equipe, StatusItem } from "@/lib/types";
import { SelectField, TextField } from "./FormControls";
import { PhotoUploadField } from "./PhotoUploadField";

export interface ServicoRow {
  id: string;
  equipamento: string;
  area: string;
  responsavel: string;
  equipe: Equipe;
  categoria: string;
  motivo: string;
  status: StatusItem;
  fotoAntes: string;
  fotoDurante: string;
  fotoDepois: string;
}

const EQUIPE_OPTIONS = ["Elétrica", "Mecânica", "Instrumentação", "Operação", "Segurança", "Civil"].map((e) => ({ value: e, label: e }));
const CATEGORIA_OPTIONS = ["Preventiva", "Corretiva", "Preditiva", "Melhoria"].map((c) => ({ value: c, label: c }));
const STATUS_OPTIONS = [
  { value: "concluido", label: "Concluído" },
  { value: "em_andamento", label: "Em Andamento" },
  { value: "pendente", label: "Pendente" },
  { value: "atrasado", label: "Atrasado" },
];

interface Props {
  item: ServicoRow;
  index: number;
  onChange: (patch: Partial<ServicoRow>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
}

export function ServicoRowEditor({ item, index, onChange, onRemove, onDuplicate }: Props) {
  return (
    <div className="relative rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
      <div className="absolute right-3 top-3 flex items-center gap-1">
        <button
          type="button"
          onClick={onDuplicate}
          aria-label="Duplicar serviço"
          className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-brand-100 hover:text-brand-600"
        >
          <Copy size={14} />
        </button>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remover serviço"
          className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-danger-100 hover:text-danger-600"
        >
          <Trash2 size={14} />
        </button>
      </div>
      <p className="mb-3 text-xs font-bold text-brand-600">OS {index + 1}</p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <PhotoUploadField label="Foto Antes" value={item.fotoAntes} onChange={(v) => onChange({ fotoAntes: v })} />
        <PhotoUploadField label="Foto Durante" value={item.fotoDurante} onChange={(v) => onChange({ fotoDurante: v })} />
        <PhotoUploadField label="Foto Depois" value={item.fotoDepois} onChange={(v) => onChange({ fotoDepois: v })} className="col-span-2 sm:col-span-1" />

        <TextField
          label="Equipamento / OS"
          required
          value={item.equipamento}
          onChange={(v) => onChange({ equipamento: v })}
          placeholder="Ex: Redutor de Velocidade"
          className="col-span-2 sm:col-span-2"
        />
        <TextField label="Local / Área" value={item.area} onChange={(v) => onChange({ area: v })} className="col-span-2 sm:col-span-2" />

        <TextField
          label="Motivo / Problema"
          required
          value={item.motivo}
          onChange={(v) => onChange({ motivo: v })}
          placeholder="Ex: Vazamento identificado na ronda"
          className="col-span-2 sm:col-span-4"
        />

        <SelectField label="Status" value={item.status} onChange={(v) => onChange({ status: v as StatusItem })} options={STATUS_OPTIONS} />
        <SelectField label="Equipe" value={item.equipe} onChange={(v) => onChange({ equipe: v as Equipe })} options={EQUIPE_OPTIONS} />
        <SelectField label="Categoria" value={item.categoria} onChange={(v) => onChange({ categoria: v })} options={CATEGORIA_OPTIONS} />
        <TextField label="Responsável" value={item.responsavel} onChange={(v) => onChange({ responsavel: v })} />
      </div>
    </div>
  );
}
