"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowLeft, Camera, Check, ChevronDown, Loader2, Plus, RefreshCw } from "lucide-react";
import type { Equipe, ParadaCompleta, Servico } from "@/lib/types";
import { getParadaCompleta, capturarFotoServico, uploadFoto, adicionarServicoRapido } from "@/lib/actions/paradas";
import { compressImageFile, NO_PHOTO_PLACEHOLDER } from "@/lib/image-utils";
import { getEditorSenha } from "@/lib/editor-auth";
import { EditorPasswordForm } from "@/components/shared/EditorPasswordForm";
import { useEditorMode } from "@/lib/useEditorMode";
import { cn } from "@/lib/utils";

const EQUIPE_OPTIONS: Equipe[] = ["Elétrica", "Mecânica", "Instrumentação", "Operação", "Segurança", "Civil", "Caldeiraria"];
const CATEGORIA_OPTIONS = ["Preventiva", "Corretiva", "Preditiva", "Lubrificação", "Melhoria", "Etiqueta Vermelha", "Etiqueta Amarela"];

function NovaOsForm({ paradaId, onCriada }: { paradaId: string; onCriada: (servico: Servico) => void }) {
  const [aberto, setAberto] = useState(false);
  const [numeroOS, setNumeroOS] = useState("");
  const [equipamento, setEquipamento] = useState("");
  const [equipe, setEquipe] = useState<Equipe>("Mecânica");
  const [categoria, setCategoria] = useState("Corretiva");
  const [motivo, setMotivo] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  async function handleSalvar() {
    if (!equipamento.trim()) {
      setErro("Informe o equipamento.");
      return;
    }
    setErro("");
    setLoading(true);
    try {
      const resultado = await adicionarServicoRapido(
        paradaId,
        { numeroOS, equipamento, area: "", responsavel: "", equipe, categoria, motivo },
        getEditorSenha()
      );
      if (!resultado.ok || !resultado.servico) {
        setErro(resultado.erro || "Não foi possível criar a OS.");
        return;
      }
      onCriada(resultado.servico);
      setNumeroOS("");
      setEquipamento("");
      setMotivo("");
      setCategoria("Corretiva");
      setAberto(false);
    } catch {
      setErro("Não foi possível criar a OS. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-brand-300 bg-brand-50 px-4 py-4 text-sm font-bold text-brand-700 transition-colors hover:bg-brand-100"
      >
        <Plus size={18} />
        Abrir Nova OS
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-brand-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900">Abrir Nova OS</h3>
        <button type="button" onClick={() => setAberto(false)} className="text-slate-400">
          <ChevronDown size={18} />
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">Número da OS</label>
          <input
            value={numeroOS === "Oportunidade" ? "" : numeroOS}
            onChange={(e) => setNumeroOS(e.target.value)}
            placeholder={numeroOS === "Oportunidade" ? "Oportunidade" : "Ex: 53.298"}
            className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
          <label className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <input
              type="checkbox"
              checked={numeroOS === "Oportunidade"}
              onChange={(e) => setNumeroOS(e.target.checked ? "Oportunidade" : "")}
              className="h-3.5 w-3.5 rounded border-slate-300 text-brand-600 focus:ring-brand-400"
            />
            Oportunidade (sem nº de OS)
          </label>
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">Equipamento *</label>
          <input
            value={equipamento}
            onChange={(e) => setEquipamento(e.target.value)}
            placeholder="Ex: Bomba do Tanque 15"
            className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">Equipe</label>
            <select
              value={equipe}
              onChange={(e) => setEquipe(e.target.value as Equipe)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            >
              {EQUIPE_OPTIONS.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">Categoria</label>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            >
              {CATEGORIA_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">Motivo (opcional)</label>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={2}
            placeholder="Ex: Vazamento identificado na ronda"
            className="w-full resize-none rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
        </div>
      </div>

      {erro && (
        <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-danger-600">
          <AlertCircle size={13} />
          {erro}
        </p>
      )}

      <button
        type="button"
        onClick={handleSalvar}
        disabled={loading}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
        {loading ? "Salvando..." : "Salvar OS"}
      </button>
    </div>
  );
}

function EtapaDot({ preenchida, horario, label }: { preenchida: boolean; horario?: string; label: string }) {
  return (
    <div className={cn("flex flex-1 flex-col items-center gap-1 rounded-lg py-2", preenchida ? "bg-success-100" : "bg-slate-100")}>
      <div className={cn("flex h-6 w-6 items-center justify-center rounded-full", preenchida ? "bg-success-600 text-white" : "bg-slate-300 text-slate-500")}>
        {preenchida ? <Check size={13} /> : <span className="text-[10px] font-bold">·</span>}
      </div>
      <p className={cn("text-[10px] font-bold uppercase", preenchida ? "text-success-700" : "text-slate-400")}>{label}</p>
      {horario && <p className="text-[10px] font-mono font-semibold text-success-600">{horario}</p>}
    </div>
  );
}

function ServicoCapturaCard({
  paradaId,
  servico,
  onCaptured,
}: {
  paradaId: string;
  servico: Servico;
  onCaptured: (servicoId: string, patch: Partial<Servico>) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [ultimoResultado, setUltimoResultado] = useState("");
  // Guardamos a foto já comprimida quando o envio falha (ex: sinal fraco em
  // campo) para que "Tentar novamente" reenvie o mesmo arquivo sem precisar
  // reabrir a câmera e tirar a foto de novo.
  const [pendente, setPendente] = useState<{ blob: Blob; nome: string } | null>(null);

  const temAntes = !!servico.fotoAntes && servico.fotoAntes !== NO_PHOTO_PLACEHOLDER;
  const temDurante = !!servico.fotoDurante;
  const temDepois = !!servico.fotoDepois && servico.fotoDepois !== NO_PHOTO_PLACEHOLDER;

  async function enviar(blob: Blob, nome: string, tentativas = 3) {
    setErro("");
    setUltimoResultado("");
    setLoading(true);
    try {
      const formData = new FormData();
      formData.set("file", blob, nome);
      const senha = getEditorSenha();

      let upload: Awaited<ReturnType<typeof uploadFoto>> | null = null;
      let ultimoErro = "";
      for (let tentativa = 1; tentativa <= tentativas; tentativa++) {
        try {
          upload = await uploadFoto(formData, senha);
          if (upload.ok) break;
          ultimoErro = upload.erro || "Não foi possível enviar a foto.";
        } catch {
          ultimoErro = "";
        }
        if (tentativa < tentativas) await new Promise((r) => setTimeout(r, 1200 * tentativa));
      }

      if (!upload || !upload.ok || !upload.url) {
        setPendente({ blob, nome });
        setErro(ultimoErro || "Sinal fraco — não foi possível enviar a foto. Toque em Tentar Novamente.");
        return;
      }

      const resultado = await capturarFotoServico(paradaId, servico.id, upload.url, senha);
      if (!resultado.ok) {
        setPendente(null);
        setErro(resultado.erro || "Não foi possível registrar a foto.");
        return;
      }

      setPendente(null);
      const campo = resultado.label === "Antes" ? "fotoAntes" : resultado.label === "Durante" ? "fotoDurante" : "fotoDepois";
      const horarioCampo = resultado.label === "Antes" ? "fotoAntesHorario" : resultado.label === "Durante" ? "fotoDuranteHorario" : "fotoDepoisHorario";
      onCaptured(servico.id, { [campo]: upload.url, [horarioCampo]: resultado.horario } as Partial<Servico>);
      setUltimoResultado(`Registrada como "${resultado.label}" às ${resultado.horario}`);
    } catch {
      setPendente({ blob, nome });
      setErro("Sinal fraco — não foi possível enviar a foto. Toque em Tentar Novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setErro("");
    setUltimoResultado("");
    setLoading(true);
    try {
      const comprimido = await compressImageFile(file);
      await enviar(comprimido, file.name);
    } catch {
      setErro("Não foi possível processar a foto. Tente novamente.");
      setLoading(false);
    }
  }

  function handleTentarNovamente() {
    if (pendente) enviar(pendente.blob, pendente.nome);
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <input ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
      <p className="text-[10px] font-bold uppercase tracking-wide text-brand-600">OS {servico.numeroOS}</p>
      <h3 className="mt-0.5 text-base font-bold leading-snug text-slate-900">{servico.equipamento}</h3>
      <p className="mt-0.5 text-xs text-slate-400">{servico.area}</p>

      <div className="mt-3 flex gap-2">
        <EtapaDot preenchida={temAntes} horario={servico.fotoAntesHorario} label="Antes" />
        <EtapaDot preenchida={temDurante} horario={servico.fotoDuranteHorario} label="Durante" />
        <EtapaDot preenchida={temDepois} horario={servico.fotoDepoisHorario} label="Depois" />
      </div>

      {pendente ? (
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={handleTentarNovamente}
            disabled={loading}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-danger-600 px-4 py-3.5 text-sm font-bold text-white transition-colors hover:opacity-90 disabled:opacity-60"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
            {loading ? "Reenviando..." : "Tentar Novamente"}
          </button>
          <button
            type="button"
            onClick={() => {
              setPendente(null);
              setErro("");
              inputRef.current?.click();
            }}
            disabled={loading}
            aria-label="Tirar outra foto"
            className="flex items-center justify-center rounded-xl border border-slate-200 px-4 py-3.5 text-slate-500 transition-colors hover:bg-slate-50 disabled:opacity-60"
          >
            <Camera size={18} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={loading}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3.5 text-sm font-bold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
          {loading ? "Enviando..." : "Tirar Foto"}
        </button>
      )}

      {ultimoResultado && <p className="mt-2 text-center text-xs font-semibold text-success-600">{ultimoResultado}</p>}
      {erro && (
        <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-xs font-semibold text-danger-600">
          <AlertCircle size={13} />
          {erro}
        </p>
      )}
    </div>
  );
}

function CapturaRapidaConteudo({ id }: { id: string }) {
  const [data, setData] = useState<ParadaCompleta | null>(null);
  const [status, setStatus] = useState<"loading" | "found" | "not-found">("loading");
  const [atualizando, setAtualizando] = useState(false);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date | null>(null);
  const [horaAgora, setHoraAgora] = useState<Date | null>(null);

  async function carregar(mostrarSpinner = false) {
    if (mostrarSpinner) setAtualizando(true);
    try {
      const res = await getParadaCompleta(id);
      if (res) {
        setData(res);
        setStatus("found");
        setUltimaAtualizacao(new Date());
      } else {
        setStatus("not-found");
      }
    } finally {
      if (mostrarSpinner) setAtualizando(false);
    }
  }

  useEffect(() => {
    carregar();

    // O celular pode ficar com essa tela aberta o dia inteiro em campo, enquanto
    // outras OS são criadas no computador — então além da carga inicial, atualiza
    // sozinho quando o app volta ao primeiro plano e periodicamente em segundo plano.
    // O intervalo é curto de propósito: em campo, "atualizado há 1 minuto" já é
    // tarde demais quando alguém está esperando a lista aparecer.
    function onVisibilidade() {
      if (document.visibilityState === "visible") carregar();
    }
    document.addEventListener("visibilitychange", onVisibilidade);
    window.addEventListener("focus", onVisibilidade);
    const intervalo = setInterval(() => {
      if (document.visibilityState === "visible") carregar();
    }, 8000);
    const relogio = setInterval(() => setHoraAgora(new Date()), 1000);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilidade);
      window.removeEventListener("focus", onVisibilidade);
      clearInterval(intervalo);
      clearInterval(relogio);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const segundosAtras = ultimaAtualizacao && horaAgora ? Math.max(0, Math.round((horaAgora.getTime() - ultimaAtualizacao.getTime()) / 1000)) : null;

  function handleCaptured(servicoId: string, patch: Partial<Servico>) {
    setData((prev) => {
      if (!prev) return prev;
      return { ...prev, servicos: prev.servicos.map((s) => (s.id === servicoId ? { ...s, ...patch } : s)) };
    });
  }

  function handleOsCriada(servico: Servico) {
    setData((prev) => (prev ? { ...prev, servicos: [...prev.servicos, servico] } : prev));
  }

  if (status === "loading") return <div className="min-h-screen bg-slate-50" />;

  if (status === "not-found" || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-6 text-center">
        <AlertCircle size={28} className="text-warning-600" />
        <h1 className="text-lg font-bold text-slate-900">Relatório não encontrado</h1>
        <Link href="/" className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-700">
          Voltar ao Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="flex items-center gap-3 px-4 py-4">
          <Link href={`/parada/${id}`} className="flex h-9 w-9 flex-none items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <ArrowLeft size={18} />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-slate-900">Captura Rápida</p>
            <p className="truncate text-xs font-medium text-slate-400">{data.resumo.nome}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => carregar(true)}
          disabled={atualizando}
          className="flex w-full items-center justify-center gap-2 border-t border-slate-100 bg-slate-50 py-2.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-60"
        >
          <RefreshCw size={14} className={atualizando ? "animate-spin" : undefined} />
          {atualizando
            ? "Atualizando..."
            : segundosAtras === null
              ? "Atualizar"
              : segundosAtras < 3
                ? "Atualizado agora — toque para atualizar"
                : `Atualizado há ${segundosAtras}s — toque para atualizar`}
        </button>
      </header>

      <main className="mx-auto max-w-lg space-y-3 px-4 py-5">
        <NovaOsForm paradaId={id} onCriada={handleOsCriada} />

        {data.servicos.length === 0 ? (
          <p className="py-16 text-center text-sm text-slate-400">Nenhuma OS cadastrada ainda neste relatório.</p>
        ) : (
          data.servicos.map((servico) => <ServicoCapturaCard key={servico.id} paradaId={id} servico={servico} onCaptured={handleCaptured} />)
        )}
      </main>
    </div>
  );
}

export function CapturaRapida({ id }: { id: string }) {
  const { ready, isEditor, unlock } = useEditorMode();

  if (!ready) return <div className="min-h-screen bg-slate-50" />;

  if (!isEditor) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-50 px-6">
        <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <EditorPasswordForm onUnlock={unlock} onSuccess={() => {}} titulo="Acesso Restrito" descricao="Digite a senha para registrar fotos em campo." />
        </div>
        <Link href={`/parada/${id}`} className="text-sm font-semibold text-slate-400 hover:text-slate-700">
          Voltar ao Relatório
        </Link>
      </div>
    );
  }

  return <CapturaRapidaConteudo id={id} />;
}
