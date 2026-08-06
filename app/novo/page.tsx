"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, History, Plus, X } from "lucide-react";
import type { CaminhoCriticoItem, ParadaCompleta, ParadaResumo, Pendencia, Servico, StatusGeral, TimelineEvento } from "@/lib/types";
import { deriveGraficos, deriveKpis, textoExecutadoPadrao, textoResultadoPadrao } from "@/lib/derive";
import { gerarResultadoFinal } from "@/lib/mock-data";
import { getParadaCompleta, saveParada } from "@/lib/actions/paradas";
import { getEditorSenha } from "@/lib/editor-auth";
import { slugify } from "@/lib/utils";
import { clearDraft, getDraft, saveDraft } from "@/lib/draft-store";
import { NO_PHOTO_PLACEHOLDER } from "@/lib/image-utils";
import { SelectField, TextAreaField, TextField } from "@/components/forms/FormControls";
import { CollapsibleSection } from "@/components/forms/CollapsibleSection";
import { TimelineRowEditor, type TimelineRow } from "@/components/forms/TimelineRowEditor";
import { ServicoRowEditor, type ServicoRow } from "@/components/forms/ServicoRowEditor";
import { CaminhoRowEditor, type CaminhoRow } from "@/components/forms/CaminhoRowEditor";
import { PendenciaRowEditor, type PendenciaRow } from "@/components/forms/PendenciaRowEditor";
import { PhotoUploadField } from "@/components/forms/PhotoUploadField";
import { EditorPasswordForm } from "@/components/shared/EditorPasswordForm";
import { useEditorMode } from "@/lib/useEditorMode";

const STATUS_GERAL_OPTIONS = [
  { value: "em_andamento", label: "Em Andamento" },
  { value: "concluida", label: "Concluída" },
  { value: "ressalvas", label: "Concluída com Ressalvas" },
];

const IMAGEM_PADRAO = "industrial-press";

const PLANEJADO_REALIZADO_PADRAO = [
  { etapa: "Desmontagem", planejado: 0, realizado: 0 },
  { etapa: "Inspeção", planejado: 0, realizado: 0 },
  { etapa: "Substituição", planejado: 0, realizado: 0 },
  { etapa: "Testes", planejado: 0, realizado: 0 },
  { etapa: "Partida", planejado: 0, realizado: 0 },
];

function novoTimelineItem(): TimelineRow {
  return { id: crypto.randomUUID(), horario: "08:00", titulo: "", responsavel: "", descricao: "", icone: "wrench", status: "concluido" };
}

function novoServicoItem(defaults: { area: string; responsavel: string }): ServicoRow {
  return {
    id: crypto.randomUUID(),
    equipamento: "",
    area: defaults.area,
    responsavel: defaults.responsavel,
    equipe: "Mecânica",
    categoria: "Corretiva",
    motivo: "",
    status: "concluido",
    fotoAntes: "",
    fotoDurante: "",
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

function novaPendenciaItem(): PendenciaRow {
  return { id: crypto.randomUUID(), item: "", motivo: "" };
}

function servicoParaLinha(s: Servico): ServicoRow {
  return {
    id: s.id,
    equipamento: s.equipamento,
    area: s.area,
    responsavel: s.responsavel,
    equipe: s.equipe,
    categoria: s.categoria ?? "Corretiva",
    motivo: s.problemaIdentificado,
    status: s.status,
    fotoAntes: s.fotoAntes === NO_PHOTO_PLACEHOLDER ? "" : s.fotoAntes,
    fotoDurante: s.fotoDurante ?? "",
    fotoDepois: s.fotoDepois === NO_PHOTO_PLACEHOLDER ? "" : s.fotoDepois,
  };
}

function caminhoParaLinha(c: CaminhoCriticoItem): CaminhoRow {
  return { ...c, causaAtraso: c.causaAtraso ?? "" };
}

interface DraftSnapshot {
  nome: string;
  maquina: string;
  data: string;
  duracaoPlanejada: string;
  duracaoRealizada: string;
  responsavel: string;
  status: StatusGeral;
  imagem: string;
  fotoMaquina: string;
  seguranca: number;
  servicos: ServicoRow[];
  pendencias: PendenciaRow[];
  timeline: TimelineRow[];
  caminhoCritico: CaminhoRow[];
  planejadoRealizado: typeof PLANEJADO_REALIZADO_PADRAO;
  resumoFinalCustom: string;
  savedAt: number;
}

function draftPossuiConteudo(d: DraftSnapshot): boolean {
  return !!(d.nome.trim() || d.maquina.trim() || d.servicos.length || d.pendencias.length || d.timeline.length || d.caminhoCritico.length);
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
  children: React.ReactNode;
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

function NovaParadaForm() {
  const router = useRouter();

  const [editId, setEditId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const [nome, setNome] = useState("");
  const [maquina, setMaquina] = useState("");
  const [data, setData] = useState("");
  const [duracaoPlanejada, setDuracaoPlanejada] = useState("48h");
  const [duracaoRealizada, setDuracaoRealizada] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [status, setStatus] = useState<StatusGeral>("em_andamento");
  const [imagem, setImagem] = useState(IMAGEM_PADRAO);
  const [fotoMaquina, setFotoMaquina] = useState("");
  const [seguranca, setSeguranca] = useState(100);

  const [servicos, setServicos] = useState<ServicoRow[]>([]);
  const [pendencias, setPendencias] = useState<PendenciaRow[]>([]);
  const [timeline, setTimeline] = useState<TimelineRow[]>([]);
  const [caminhoCritico, setCaminhoCritico] = useState<CaminhoRow[]>([]);
  const [planejadoRealizado, setPlanejadoRealizado] = useState(PLANEJADO_REALIZADO_PADRAO);
  const [resumoFinalCustom, setResumoFinalCustom] = useState("");
  const [erro, setErro] = useState("");
  const [draftDisponivel, setDraftDisponivel] = useState<DraftSnapshot | null>(null);
  const draftKeyRef = useRef("novo");
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submetidoRef = useRef(false);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("edit");
    setEditId(id);
    draftKeyRef.current = id ?? "novo";

    if (!id) {
      const draft = getDraft<DraftSnapshot>(draftKeyRef.current);
      if (draft && draftPossuiConteudo(draft)) setDraftDisponivel(draft);
      setReady(true);
      return;
    }

    (async () => {
      const existing = await getParadaCompleta(id);
      if (!existing) {
        setNotFound(true);
        setReady(true);
        return;
      }
      setNome(existing.resumo.nome);
      setMaquina(existing.resumo.maquina);
      setData(existing.resumo.data);
      setDuracaoPlanejada(existing.resumo.duracaoPlanejada);
      setDuracaoRealizada(existing.resumo.duracaoRealizada);
      setResponsavel(existing.resumo.responsavel);
      setStatus(existing.resumo.status);
      setImagem(existing.resumo.imagem);
      setFotoMaquina(existing.resumo.fotosMaquina?.[0] ?? "");
      setSeguranca(existing.kpis.seguranca);
      setServicos(existing.servicos.map(servicoParaLinha));
      setPendencias(existing.pendencias.map((p) => ({ ...p })));
      setTimeline(existing.timeline.map((t) => ({ ...t })));
      setCaminhoCritico(existing.caminhoCritico.map(caminhoParaLinha));
      setPlanejadoRealizado(existing.graficos.planejadoRealizado.length ? existing.graficos.planejadoRealizado.map((p) => ({ ...p })) : PLANEJADO_REALIZADO_PADRAO);
      setResumoFinalCustom(existing.resultadoFinal.resumo);

      const draft = getDraft<DraftSnapshot>(draftKeyRef.current);
      if (draft && draftPossuiConteudo(draft)) setDraftDisponivel(draft);
      setReady(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Rascunho automático: salva o estado do formulário enquanto o usuário preenche
  useEffect(() => {
    if (!ready || draftDisponivel || submetidoRef.current) return;
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(() => {
      if (submetidoRef.current) return;
      const snapshot: DraftSnapshot = {
        nome,
        maquina,
        data,
        duracaoPlanejada,
        duracaoRealizada,
        responsavel,
        status,
        imagem,
        fotoMaquina,
        seguranca,
        servicos,
        pendencias,
        timeline,
        caminhoCritico,
        planejadoRealizado,
        resumoFinalCustom,
        savedAt: Date.now(),
      };
      if (draftPossuiConteudo(snapshot)) saveDraft(draftKeyRef.current, snapshot);
    }, 800);
    return () => {
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    };
  }, [
    ready,
    draftDisponivel,
    nome,
    maquina,
    data,
    duracaoPlanejada,
    duracaoRealizada,
    responsavel,
    status,
    imagem,
    fotoMaquina,
    seguranca,
    servicos,
    pendencias,
    timeline,
    caminhoCritico,
    planejadoRealizado,
    resumoFinalCustom,
  ]);

  function restaurarRascunho() {
    if (!draftDisponivel) return;
    setNome(draftDisponivel.nome);
    setMaquina(draftDisponivel.maquina);
    setData(draftDisponivel.data);
    setDuracaoPlanejada(draftDisponivel.duracaoPlanejada);
    setDuracaoRealizada(draftDisponivel.duracaoRealizada);
    setResponsavel(draftDisponivel.responsavel);
    setStatus(draftDisponivel.status);
    setImagem(draftDisponivel.imagem);
    setFotoMaquina(draftDisponivel.fotoMaquina);
    setSeguranca(draftDisponivel.seguranca);
    setServicos(draftDisponivel.servicos);
    setPendencias(draftDisponivel.pendencias);
    setTimeline(draftDisponivel.timeline);
    setCaminhoCritico(draftDisponivel.caminhoCritico);
    setPlanejadoRealizado(draftDisponivel.planejadoRealizado);
    setResumoFinalCustom(draftDisponivel.resumoFinalCustom);
    setDraftDisponivel(null);
  }

  function descartarRascunho() {
    clearDraft(draftKeyRef.current);
    setDraftDisponivel(null);
  }

  function updateRow<T extends { id: string }>(setter: React.Dispatch<React.SetStateAction<T[]>>, id: string, patch: Partial<T>) {
    setter((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!nome.trim() || !maquina.trim() || !data || !responsavel.trim()) {
      setErro("Preencha os campos obrigatórios em Dados Gerais.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setErro("");

    const id = editId || `${slugify(nome) || "parada"}-${Date.now().toString(36)}`;

    const resumo: ParadaResumo = {
      id,
      nome: nome.trim(),
      maquina: maquina.trim(),
      area: maquina.trim(),
      data,
      duracaoPlanejada: duracaoPlanejada.trim() || "0h",
      duracaoRealizada: duracaoRealizada.trim() || duracaoPlanejada.trim() || "0h",
      status,
      responsavel: responsavel.trim(),
      imagem,
      fotosMaquina: fotoMaquina ? [fotoMaquina] : undefined,
    };

    const servicosFinal: Servico[] = servicos
      .filter((s) => s.equipamento.trim())
      .map((s, i) => ({
        id: s.id,
        numeroOS: String(i + 1).padStart(3, "0"),
        titulo: `Manutenção em ${s.equipamento.trim()}`,
        equipamento: s.equipamento,
        area: s.area,
        responsavel: s.responsavel,
        equipe: s.equipe,
        categoria: s.categoria,
        horaInicio: "",
        horaFim: "",
        tempoGasto: "1h",
        problemaIdentificado: s.motivo.trim() || "Necessidade identificada durante a parada.",
        servicoExecutado: textoExecutadoPadrao(s.status),
        resultado: textoResultadoPadrao(s.status),
        status: s.status,
        fotoAntes: s.fotoAntes || NO_PHOTO_PLACEHOLDER,
        fotoDurante: s.fotoDurante || undefined,
        fotoDepois: s.fotoDepois || NO_PHOTO_PLACEHOLDER,
      }));

    const caminhoCriticoFinal: CaminhoCriticoItem[] = caminhoCritico;
    const pendenciasFinal: Pendencia[] = pendencias.filter((p) => p.item.trim()).map((p) => ({ id: p.id, item: p.item.trim(), motivo: p.motivo.trim() || "Não informado" }));

    const timelineFinal: TimelineEvento[] = timeline;

    const kpis = deriveKpis(servicosFinal, seguranca);
    const graficos = deriveGraficos(servicosFinal, caminhoCriticoFinal, planejadoRealizado, kpis.eficiencia);
    const resultadoFinal = gerarResultadoFinal(resumo, kpis);
    if (resumoFinalCustom.trim()) resultadoFinal.resumo = resumoFinalCustom.trim();

    const parada: ParadaCompleta = {
      resumo,
      kpis,
      timeline: timelineFinal,
      servicos: servicosFinal,
      fotos: [],
      caminhoCritico: caminhoCriticoFinal,
      pendencias: pendenciasFinal,
      graficos,
      resultadoFinal,
    };

    const resultado = await saveParada(parada, getEditorSenha());
    if (!resultado.ok) {
      setErro(resultado.erro || "Não foi possível salvar o relatório.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    submetidoRef.current = true;
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    clearDraft(draftKeyRef.current);
    router.push(`/parada/${id}`);
  }

  if (!ready) {
    return <div className="min-h-screen bg-slate-50" />;
  }

  if (notFound) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-6 text-center">
        <AlertCircle size={28} className="text-warning-600" />
        <h1 className="text-lg font-bold text-slate-900">Relatório não encontrado</h1>
        <p className="max-w-sm text-sm text-slate-500">Este relatório não existe neste navegador ou já foi excluído.</p>
        <Link href="/" className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-700">
          Voltar ao Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-6 py-5 sm:px-10">
          <Link href="/" className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700">
            <ArrowLeft size={17} />
          </Link>
          <Image src="/santher-logo-azul.png" alt="Santher" width={110} height={29} className="h-7 w-auto" />
          <div className="hidden h-8 w-px bg-slate-200 sm:block" />
          <div className="hidden sm:block">
            <p className="text-sm font-bold leading-none text-slate-900">{editId ? "Editar Relatório" : "Alimentar Novo Relatório"}</p>
            <p className="mt-1 text-xs font-medium text-slate-400">
              {editId ? "Alterações são salvas neste navegador." : "Rápido: fotos, OS, motivos e pendências. O resto é opcional."}
            </p>
          </div>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="mx-auto max-w-5xl space-y-6 px-6 py-10 sm:px-10">
        {draftDisponivel && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-100 bg-brand-50 px-4 py-3 text-sm">
            <div className="flex items-center gap-2 font-semibold text-brand-700">
              <History size={16} />
              Encontramos um rascunho não salvo deste formulário. Deseja restaurar?
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={restaurarRascunho}
                className="rounded-lg bg-brand-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-brand-700"
              >
                Restaurar
              </button>
              <button
                type="button"
                onClick={descartarRascunho}
                className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-800"
              >
                <X size={13} />
                Descartar
              </button>
            </div>
          </div>
        )}

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
            <TextField label="Responsável" required value={responsavel} onChange={setResponsavel} placeholder="Nome do responsável" />
            <TextField label="Data" required type="date" value={data} onChange={setData} />
            <SelectField label="Status Geral" value={status} onChange={(v) => setStatus(v as StatusGeral)} options={STATUS_GERAL_OPTIONS} />
            <TextField label="Tempo Planejado" value={duracaoPlanejada} onChange={setDuracaoPlanejada} placeholder="Ex: 48h" />
            <TextField label="Tempo Realizado" value={duracaoRealizada} onChange={setDuracaoRealizada} placeholder="Ex: 51h 20min" />
            <PhotoUploadField
              label="Foto da Máquina (capa e card do dashboard)"
              value={fotoMaquina}
              onChange={setFotoMaquina}
              className="sm:col-span-2 sm:max-w-xs"
            />
          </div>
        </FormSection>

        <FormSection numero={2} titulo="Serviços Executados (OS)" descricao="O essencial: foto, equipamento e motivo. Cada um vira um slide no relatório.">
          <div className="space-y-3">
            {servicos.map((item, i) => (
              <ServicoRowEditor
                key={item.id}
                item={item}
                index={i}
                onChange={(patch) => updateRow(setServicos, item.id, patch)}
                onRemove={() => setServicos((prev) => prev.filter((r) => r.id !== item.id))}
                onDuplicate={() =>
                  setServicos((prev) => {
                    const idx = prev.findIndex((r) => r.id === item.id);
                    const copia = { ...item, id: crypto.randomUUID() };
                    return [...prev.slice(0, idx + 1), copia, ...prev.slice(idx + 1)];
                  })
                }
              />
            ))}
          </div>
          <div className="mt-4">
            <AddButton label="Adicionar Serviço (OS)" onClick={() => setServicos((prev) => [...prev, novoServicoItem({ area: maquina, responsavel })])} />
          </div>
        </FormSection>

        <FormSection numero={3} titulo="O Que Não Foi Feito" descricao="Pendências rápidas: o que ficou de fora e o motivo.">
          <div className="space-y-3">
            {pendencias.map((item) => (
              <PendenciaRowEditor
                key={item.id}
                item={item}
                onChange={(patch) => updateRow(setPendencias, item.id, patch)}
                onRemove={() => setPendencias((prev) => prev.filter((r) => r.id !== item.id))}
              />
            ))}
          </div>
          <div className="mt-4">
            <AddButton label="Adicionar Pendência" onClick={() => setPendencias((prev) => [...prev, novaPendenciaItem()])} />
          </div>
        </FormSection>

        <CollapsibleSection numero={4} titulo="Linha do Tempo" descricao="Eventos cronológicos — bloqueios, testes, partida, etc." badge="Opcional" defaultOpen={timeline.length > 0}>
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
        </CollapsibleSection>

        <CollapsibleSection
          numero={5}
          titulo="Caminho Crítico"
          descricao="Atividades que determinam o prazo final — desvios são destacados automaticamente."
          badge="Opcional"
          defaultOpen={caminhoCritico.length > 0}
        >
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
        </CollapsibleSection>

        <CollapsibleSection
          numero={6}
          titulo="Planejado x Realizado"
          descricao="Horas por etapa da parada, usadas no gráfico comparativo."
          badge="Opcional"
          defaultOpen={planejadoRealizado.some((p) => p.planejado > 0 || p.realizado > 0)}
        >
          <div className="space-y-3">
            {planejadoRealizado.map((etapa, i) => (
              <div key={etapa.etapa} className="grid grid-cols-3 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm font-bold text-slate-700">{etapa.etapa}</p>
                <input
                  type="number"
                  min={0}
                  value={etapa.planejado}
                  onChange={(e) => setPlanejadoRealizado((prev) => prev.map((p, idx) => (idx === i ? { ...p, planejado: Number(e.target.value) || 0 } : p)))}
                  placeholder="Planejado (h)"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                />
                <input
                  type="number"
                  min={0}
                  value={etapa.realizado}
                  onChange={(e) => setPlanejadoRealizado((prev) => prev.map((p, idx) => (idx === i ? { ...p, realizado: Number(e.target.value) || 0 } : p)))}
                  placeholder="Realizado (h)"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                />
              </div>
            ))}
          </div>
        </CollapsibleSection>

        <FormSection numero={7} titulo="Resultado Final" descricao="Índice de segurança e resumo executivo (opcional — gerado automaticamente se vazio).">
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
            {editId ? "Salvar Alterações" : "Salvar e Visualizar Relatório"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function NovaParadaPage() {
  const { ready, isEditor, unlock } = useEditorMode();

  if (!ready) {
    return <div className="min-h-screen bg-slate-50" />;
  }

  if (!isEditor) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-50 px-6">
        <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <EditorPasswordForm
            onUnlock={unlock}
            onSuccess={() => {}}
            titulo="Acesso Restrito"
            descricao="Esta área é só para quem alimenta os relatórios. Digite a senha para continuar."
          />
        </div>
        <Link href="/" className="text-sm font-semibold text-slate-400 hover:text-slate-700">
          Voltar ao Dashboard
        </Link>
      </div>
    );
  }

  return <NovaParadaForm />;
}
