"use client";

import { Trash2 } from "lucide-react";
import type { Equipe, StatusItem } from "@/lib/types";
import { SelectField, TextAreaField, TextField } from "./FormControls";

export interface ServicoRow {
  id: string;
  numeroOS: string;
  titulo: string;
  equipamento: string;
  area: string;
  responsavel: string;
  equipe: Equipe;
  categoria: string;
  horaInicio: string;
  horaFim: string;
  tempoGasto: string;
  problemaIdentificado: string;
  servicoExecutado: string;
  resultado: string;
  status: StatusItem;
  fotoAntes: string;
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
}

export function ServicoRowEditor({ item, index, onChange, onRemove }: Props) {
  return (
    <div className="relative rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remover serviço"
        className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-danger-100 hover:text-danger-600"
      >
        <Trash2 size={14} />
      </button>
      <p className="mb-3 text-xs font-bold text-brand-600">OS {index + 1}</p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <TextField label="Nº da OS" value={item.numeroOS} onChange={(v) => onChange({ numeroOS: v })} />
        <SelectField label="Categoria" value={item.categoria} onChange={(v) => onChange({ categoria: v })} options={CATEGORIA_OPTIONS} />
        <SelectField
          label="Status"
          value={item.status}
          onChange={(v) => onChange({ status: v as StatusItem })}
          options={STATUS_OPTIONS}
          className="col-span-2 sm:col-span-2"
        />

        <TextField label="Título do Serviço" value={item.titulo} onChange={(v) => onChange({ titulo: v })} className="col-span-2 sm:col-span-4" />
        <TextField label="Equipamento" value={item.equipamento} onChange={(v) => onChange({ equipamento: v })} className="col-span-2 sm:col-span-2" />
        <TextField label="Local / Área" value={item.area} onChange={(v) => onChange({ area: v })} className="col-span-2 sm:col-span-2" />

        <SelectField label="Equipe" value={item.equipe} onChange={(v) => onChange({ equipe: v as Equipe })} options={EQUIPE_OPTIONS} />
        <TextField label="Responsável" value={item.responsavel} onChange={(v) => onChange({ responsavel: v })} className="col-span-2 sm:col-span-1" />
        <TextField label="Início" type="time" value={item.horaInicio} onChange={(v) => onChange({ horaInicio: v })} />
        <TextField label="Término" type="time" value={item.horaFim} onChange={(v) => onChange({ horaFim: v })} />

        <TextField
          label="Tempo Total (ex: 3h 20min)"
          value={item.tempoGasto}
          onChange={(v) => onChange({ tempoGasto: v })}
          className="col-span-2 sm:col-span-4"
        />

        <TextAreaField
          label="Problema Identificado"
          value={item.problemaIdentificado}
          onChange={(v) => onChange({ problemaIdentificado: v })}
          rows={2}
          className="col-span-2 sm:col-span-4"
        />
        <TextAreaField
          label="O Que Foi Feito"
          value={item.servicoExecutado}
          onChange={(v) => onChange({ servicoExecutado: v })}
          rows={2}
          className="col-span-2 sm:col-span-4"
        />
        <TextAreaField
          label="Resultado"
          value={item.resultado}
          onChange={(v) => onChange({ resultado: v })}
          rows={2}
          className="col-span-2 sm:col-span-4"
        />

        <TextField
          label="Foto Antes (URL)"
          value={item.fotoAntes}
          onChange={(v) => onChange({ fotoAntes: v })}
          placeholder="Deixe em branco para usar imagem ilustrativa"
          className="col-span-2"
        />
        <TextField
          label="Foto Depois (URL)"
          value={item.fotoDepois}
          onChange={(v) => onChange({ fotoDepois: v })}
          placeholder="Deixe em branco para usar imagem ilustrativa"
          className="col-span-2"
        />
      </div>
    </div>
  );
}
