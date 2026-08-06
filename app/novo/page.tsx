"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, Factory, Plus } from "lucide-react";
import type { CaminhoCriticoItem, ParadaCompleta, ParadaResumo, Servico, StatusGeral, TimelineEvento } from "@/lib/types";
import { deriveFotos, deriveGraficos, deriveKpis } from "@/lib/derive";
import { gerarResultadoFinal } from "@/lib/mock-data";
import { saveCustomParada, slugify } from "@/lib/local-store";
import { SelectField, TextAreaField, TextField } from "@/components/forms/FormControls";
import { TimelineRowEditor, type TimelineRow } from "@/components/forms/TimelineRowEditor";
import { ServicoRowEditor, type ServicoRow } from "@/components/forms/ServicoRowEditor";
import { CaminhoRowEditor, type CaminhoRow } from "@/components/forms/CaminhoRowEditor";

const STATUS_GERAL_OPTIONS = [
  { value: "em_andamento", label: "Em Andamento" },
  { value: "concluida", label: "Concluída" },
  { value: "ressalvas", label: "Concluída com Ressalvas" },
];

const IMAGEM_OPTIONS = [
  { value: "industrial-press", label: "Prensa Industrial" },
  { value: "furnace", label: "Forno" },
  { value: "compressor", label: "Compressor" },
  { value: "bottling-line", label: "Linha de Envase" },
  { value: "boiler", label: "Caldeira" },
  { value: "conveyor", label: "Esteira Transportadora" },
];

function novoTimelineItem(): TimelineRow {
  return {
    id: crypto.randomUUID(),
    horario: "08:00",
    titulo: "",
    responsavel: "",
    descricao: "",
    icone: "wrench",
    status: "concluido",
  };
}

function novoServicoItem(): ServicoRow {
  return {
    id: crypto.randomUUID(),
    numeroOS: "",
    titulo: "",
    equipamento: "",
    area: "",
    responsavel: "",
    equipe: "Mecânica",
    categoria: "Corretiva",
    horaInicio: "08:00",
    horaFim: "10:00",
    tempoGasto: "2h 0min",
    problemaIdentificado: "",
    servicoExecutado: "",
    resultado: "",
    status: "concluido",
    fotoAntes: "",
    fotoDepois: "",
  };
}

function novoCaminhoItem(): CaminhoRow {
  return {
    id: crypto.randomUUID(),
    servico: "",
    inicioPlanejado: "08:00",
    fimPlanejado: "10:00",
    inicioReal: "08:00",
    fimReal: "10:00",
    diferencaMin: 0,
    responsavel: "",
    status: "concluido",
    causaAtraso: "",
  };
}

function FormSection({
  numero,
  titulo,
  descricao,
  children,
}: {
  numero: number;
  titulo: string;
  descricao: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-6 flex items-start gap-3">
        <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-brand-600 text-xs font-bold text-white">
          {String(numero).padStart(2, "0")}
        </span>
        <div>
          <h2 className="text-lg font-bold text-slate-900">{titulo}</h2>
          <p className="text-sm text-slate-500">{descricao}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function AddButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-xl border-2 border-dashed border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-500 transition-colors hover:border-brand-400 hover:text-brand-600"
    >
      <Plus size={15} />
      {label}
    </button>
  );
}

export default function NovaParadaPage() {
  const router = useRouter();

  const [nome, setNome] = useState("");
  const [maquina, setMaquina] = useState("");
  const [area, setArea] = useState("");
  const [data, setData] = useState("");
  const [duracaoPlanejada, setDuracaoPlanejada] = useState("48h");
  const [duracaoRealizada, setDuracaoRealizada] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [status, setStatus] = useState<StatusGeral>("em_andamento");
  const [imagem, setImagem] = useState("industrial-press");
  const [seguranca, setSeguranca] = useState(100);

  const [timeline, setTimeline] = useState<TimelineRow[]>([]);
  const [servicos, setServicos] = useState<ServicoRow[]>([]);
  const [caminhoCritico, setCaminhoCritico] = useState<CaminhoRow[]>([]);
  const [planejadoRealizado, setPlanejadoRealizado] = useState([
    { etapa: "Desmontagem", planejado: 0, realizado: 0 },
    { etapa: "Inspeção", planejado: 0, realizado: 0 },
    { etapa: "Substituição", planejado: 0, realizado: 0 },
    { etapa: "Testes", planejado: 0, realizado: 0 },
    { etapa: "Partida", planejado: 0, realizado: 0 },
  ]);
  const [resumoFinalCustom, setResumoFinalCustom] = useState("");
  const [erro, setErro] = useState("");

  function updateRow<T extends { id: string }>(
    setter: React.Dispatch<React.SetStateAction<T[]>>,
    id: string,
    patch: Partial<T>
  ) {
    setter((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!nome.trim() || !maquina.trim() || !area.trim() || !data || !responsavel.trim()) {
      setErro("Preencha os campos obrigatórios em Dados Gerais.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setErro("");

    const id = `${slugify(nome) || "parada"}-${Date.now().toString(36)}`;

    const resumo: ParadaResumo = {
      id,
      nome: nome.trim(),
      maquina: maquina.trim(),
      area: area.trim(),
      data,
      duracaoPlanejada: duracaoPlanejada.trim() || "0h",
      duracaoRealizada: duracaoRealizada.trim() || duracaoPlanejada.trim() || "0h",
      status,
      responsavel: responsavel.trim(),
      imagem,
    };

    const servicosComCategoria = servicos.map((s) => ({
      ...s,
      fotoAntes: s.fotoAntes.trim() || `https://picsum.photos/seed/${s.id}-antes/640/480`,
      fotoDepois: s.fotoDepois.trim() || `https://picsum.photos/seed/${s.id}-depois/640/480`,
    }));
    const servicosFinal: Servico[] = servicosComCategoria.map(({ categoria: _categoria, ...s }) => s);

    const caminhoCriticoFinal: CaminhoCriticoItem[] = caminhoCritico.map(({ causaAtraso: _causa, ...c }) => c);

    const timelineFinal: TimelineEvento[] = timeline;

    const kpis = deriveKpis(servicosFinal, seguranca);
    const fotos = deriveFotos(servicosFinal);
    const graficos = deriveGraficos(servicosComCategoria, caminhoCritico, planejadoRealizado, kpis.eficiencia);
    const resultadoFinal = gerarResultadoFinal(resumo, kpis);
    if (resumoFinalCustom.trim()) resultadoFinal.resumo = resumoFinalCustom.trim();

    const parada: ParadaCompleta = {
      resumo,
      kpis,
      timeline: timelineFinal,
      servicos: servicosFinal,
      fotos,
      caminhoCritico: caminhoCriticoFinal,
      graficos,
      resultadoFinal,
    };

    saveCustomParada(parada);
    router.push(`/parada/${id}`);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-6 py-5 sm:px-10">
          <Link href="/" className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700">
            <ArrowLeft size={17} />
          </Link>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
            <Factory size={17} strokeWidth={2.2} />
          </div>
          <div>
            <p className="text-sm font-bold leading-none text-slate-900">Alimentar Novo Relatório</p>
            <p className="mt-1 text-xs font-medium text-slate-400">Os dados são salvos neste navegador</p>
          </div>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="mx-auto max-w-5xl space-y-6 px-6 py-10 sm:px-10">
        {erro && (
          <div className="flex items-center gap-2 rounded-xl border border-danger-100 bg-danger-100/60 px-4 py-3 text-sm font-semibold text-danger-600">
            <AlertCircle size={16} />
            {erro}
          </div>
        )}

        <FormSection numero={1} titulo="Dados Gerais" descricao="Identificação da parada, exibida na capa do relatório.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField label="Nome da Parada" required value={nome} onChange={setNome} placeholder="Ex: Parada Geral — Prensa Hidráulica 01" className="sm:col-span-2" />
            <TextField label="Máquina" required value={maquina} onChange={setMaquina} placeholder="Ex: Prensa Hidráulica 01" />
            <TextField label="Área / Setor" required value={area} onChange={setArea} placeholder="Ex: Estamparia" />
            <TextField label="Data" required type="date" value={data} onChange={setData} />
            <TextField label="Responsável" required value={responsavel} onChange={setResponsavel} placeholder="Nome do responsável" />
            <TextField label="Tempo Planejado" value={duracaoPlanejada} onChange={setDuracaoPlanejada} placeholder="Ex: 48h" />
            <TextField label="Tempo Realizado" value={duracaoRealizada} onChange={setDuracaoRealizada} placeholder="Ex: 51h 20min" />
            <SelectField label="Status Geral" value={status} onChange={(v) => setStatus(v as StatusGeral)} options={STATUS_GERAL_OPTIONS} />
            <SelectField label="Ilustração da Máquina" value={imagem} onChange={setImagem} options={IMAGEM_OPTIONS} />
          </div>
        </FormSection>

        <FormSection numero={2} titulo="Linha do Tempo" descricao="Eventos cronológicos da parada — bloqueios, testes, partida, etc.">
          <div className="space-y-3">
            {timeline.map((item, i) => (
              <TimelineRowEditor
                key={item.id}
                item={item}
                index={i}
                onChange={(patch) => updateRow(setTimeline, item.id, patch)}
                onRemove={() => setTimeline((prev) => prev.filter((r) => r.id !== item.id))}
              />
            ))}
          </div>
          <div className="mt-4">
            <AddButton label="Adicionar Evento" onClick={() => setTimeline((prev) => [...prev, novoTimelineItem()])} />
          </div>
        </FormSection>

        <FormSection numero={3} titulo="Serviços Executados" descricao="Cada OS vira um slide no relatório, com fotos de antes e depois.">
          <div className="space-y-3">
            {servicos.map((item, i) => (
              <ServicoRowEditor
                key={item.id}
                item={item}
                index={i}
                onChange={(patch) => updateRow(setServicos, item.id, patch)}
                onRemove={() => setServicos((prev) => prev.filter((r) => r.id !== item.id))}
              />
            ))}
          </div>
          <div className="mt-4">
            <AddButton label="Adicionar Serviço (OS)" onClick={() => setServicos((prev) => [...prev, novoServicoItem()])} />
          </div>
        </FormSection>

        <FormSection numero={4} titulo="Caminho Crítico" descricao="Atividades que determinam o prazo final — desvios são destacados automaticamente.">
          <div className="space-y-3">
            {caminhoCritico.map((item, i) => (
              <CaminhoRowEditor
                key={item.id}
                item={item}
                index={i}
                onChange={(patch) => updateRow(setCaminhoCritico, item.id, patch)}
                onRemove={() => setCaminhoCritico((prev) => prev.filter((r) => r.id !== item.id))}
              />
            ))}
          </div>
          <div className="mt-4">
            <AddButton label="Adicionar Atividade" onClick={() => setCaminhoCritico((prev) => [...prev, novoCaminhoItem()])} />
          </div>
        </FormSection>

        <FormSection numero={5} titulo="Planejado x Realizado" descricao="Horas por etapa da parada, usadas no gráfico comparativo.">
          <div className="space-y-3">
            {planejadoRealizado.map((etapa, i) => (
              <div key={etapa.etapa} className="grid grid-cols-3 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm font-bold text-slate-700">{etapa.etapa}</p>
                <input
                  type="number"
                  min={0}
                  value={etapa.planejado}
                  onChange={(e) =>
                    setPlanejadoRealizado((prev) => prev.map((p, idx) => (idx === i ? { ...p, planejado: Number(e.target.value) || 0 } : p)))
                  }
                  placeholder="Planejado (h)"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                />
                <input
                  type="number"
                  min={0}
                  value={etapa.realizado}
                  onChange={(e) =>
                    setPlanejadoRealizado((prev) => prev.map((p, idx) => (idx === i ? { ...p, realizado: Number(e.target.value) || 0 } : p)))
                  }
                  placeholder="Realizado (h)"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                />
              </div>
            ))}
          </div>
        </FormSection>

        <FormSection numero={6} titulo="Resultado Final" descricao="Índice de segurança e resumo executivo de encerramento (opcional — gerado automaticamente se vazio).">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField label="Índice de Segurança (%)" type="number" value={String(seguranca)} onChange={(v) => setSeguranca(Number(v) || 0)} />
            <div className="hidden sm:block" />
            <TextAreaField
              label="Resumo do Resultado (opcional)"
              value={resumoFinalCustom}
              onChange={setResumoFinalCustom}
              placeholder="Deixe em branco para gerar automaticamente a partir do status geral"
              rows={3}
              className="sm:col-span-2"
            />
          </div>
        </FormSection>

        <div className="flex items-center justify-end gap-3 pb-10">
          <Link href="/" className="rounded-xl px-5 py-3 text-sm font-bold text-slate-500 hover:text-slate-800">
            Cancelar
          </Link>
          <button type="submit" className="rounded-xl bg-brand-600 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-700">
            Salvar e Visualizar Relatório
          </button>
        </div>
      </form>
    </div>
  );
}
