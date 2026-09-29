"use client";

import { AlertTriangle, Copy, Trash2 } from "lucide-react";
import type { Equipe, MotivoNaoFeitoCategoria, StatusItem } from "@/lib/types";
import { formatDateCompact } from "@/lib/utils";
import type { HistoricoNaoFeitoItem } from "@/lib/historico-nao-feito";
import { SelectField, TextField } from "./FormControls";
import { PhotoUploadField } from "./PhotoUploadField";

export interface ServicoRow {
  id: string;
  numeroOS: string;
  equipamento: string;
  area: string;
  responsavel: string;
  equipe: Equipe;
  categoria: string;
  motivo: string;
  status: StatusItem;
  tempoGasto: string;
  fotoAntes: string;
  fotoDurante: string;
  fotoDepois: string;
  // "Não será feito" só é marcado pela Captura Rápida (celular) — esse
  // formulário não edita esses dois campos, só carrega o valor de volta ao
  // salvar. Sem isso, salvar o formulário apagava silenciosamente qualquer
  // marcação feita em campo, porque o objeto reconstruído no submit nunca
  // incluía esses campos.
  naoFeitoCategoria?: MotivoNaoFeitoCategoria;
  justificativaNaoFeito?: string;
}

const EQUIPE_OPTIONS = ["Elétrica", "Mecânica", "Instrumentação", "Operação", "Segurança", "Civil", "Caldeiraria", "Preditiva", "Lubrificação"].map((e) => ({ value: e, label: e }));
const CATEGORIA_OPTIONS = ["Preventiva", "Corretiva", "Preditiva", "Lubrificação", "Melhoria", "Etiqueta Vermelha", "Etiqueta Amarela"].map((c) => ({
  value: c,
  label: c,
}));
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
  // Última vez que essa mesma OS (ou equipamento) ficou marcada "não será
  // feito" em outro relatório — null quando não há histórico.
  historicoNaoFeito?: HistoricoNaoFeitoItem | null;
  // Nomes já usados como responsável em outros relatórios — só sugestão,
  // nunca restringe o campo (ver TextField.suggestions).
  responsaveisSugeridos?: string[];
}

export function ServicoRowEditor({ item, index, onChange, onRemove, onDuplicate, historicoNaoFeito, responsaveisSugeridos }: Props) {
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

      {/* Estado atual DESTE serviço (marcado pelo celular) — diferente do
          alerta de histórico abaixo, que é sobre OUTRA parada. Só leitura:
          esse formulário não marca/desmarca, é a Captura Rápida que faz
          isso; aqui é só pra o coordenador ver sem precisar abrir o celular. */}
      {item.naoFeitoCategoria && (
        <div className="mb-4 rounded-xl border border-danger-200 bg-danger-50 px-3 py-2.5">
          <p className="text-xs font-bold text-danger-800">Marcado em campo como não será feito — {item.naoFeitoCategoria}</p>
          {item.justificativaNaoFeito && <p className="mt-0.5 text-xs text-danger-700">{item.justificativaNaoFeito}</p>}
        </div>
      )}

      {/* Mesmo alerta da Captura Rápida, aqui no formulário de montagem do
          relatório — é aqui que dá tempo de resolver (pedir material,
          remanejar equipe) antes da parada começar, não só constatar em
          campo que de novo não foi feito. */}
      {historicoNaoFeito && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-warning-200 bg-warning-50 px-3 py-2.5">
          <AlertTriangle size={15} className="mt-0.5 flex-none text-warning-600" />
          <div className="min-w-0">
            <p className="text-xs font-bold text-warning-800">
              Não foi feito na parada &quot;{historicoNaoFeito.paradaNome}&quot; ({formatDateCompact(historicoNaoFeito.paradaData)}) — {historicoNaoFeito.categoria}
            </p>
            {historicoNaoFeito.justificativa && <p className="mt-0.5 text-xs text-warning-700">{historicoNaoFeito.justificativa}</p>}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <PhotoUploadField label="Foto Antes" value={item.fotoAntes} onChange={(v) => onChange({ fotoAntes: v })} />
        <PhotoUploadField label="Foto Durante" value={item.fotoDurante} onChange={(v) => onChange({ fotoDurante: v })} />
        <PhotoUploadField label="Foto Depois" value={item.fotoDepois} onChange={(v) => onChange({ fotoDepois: v })} className="col-span-2 sm:col-span-1" />

        <div className="col-span-2 sm:col-span-1">
          <TextField
            label="Número da OS"
            value={item.numeroOS === "Oportunidade" ? "" : item.numeroOS}
            onChange={(v) => onChange({ numeroOS: v })}
            placeholder={item.numeroOS === "Oportunidade" ? "Oportunidade" : "Ex: 53.298"}
          />
          <label className="mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
            <input
              type="checkbox"
              checked={item.numeroOS === "Oportunidade"}
              onChange={(e) => onChange({ numeroOS: e.target.checked ? "Oportunidade" : "" })}
              className="h-3.5 w-3.5 rounded border-slate-300 text-brand-600 focus:ring-brand-400"
            />
            Oportunidade (sem nº de OS)
          </label>
        </div>
        <TextField
          label="Equipamento"
          required
          value={item.equipamento}
          onChange={(v) => onChange({ equipamento: v })}
          placeholder="Ex: Redutor de Velocidade"
          className="col-span-2 sm:col-span-3"
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
        <TextField label="Responsável" value={item.responsavel} onChange={(v) => onChange({ responsavel: v })} suggestions={responsaveisSugeridos} />
        <TextField label="Tempo Gasto" value={item.tempoGasto} onChange={(v) => onChange({ tempoGasto: v })} placeholder="Ex: 2h" />
      </div>
    </div>
  );
}
