"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  Flag,
  Loader2,
  Lock,
  Play,
  Plus,
  RefreshCw,
  Search,
  Unlock,
  User,
  X,
} from "lucide-react";
import type { Equipe, ParadaCompleta, Servico, TimelineEvento } from "@/lib/types";
import { getParadaCompleta, capturarFotoServico, uploadFoto, adicionarServicoRapido, adicionarEventoRapido, marcarStatusServico } from "@/lib/actions/paradas";
import { compressImageFile, NO_PHOTO_PLACEHOLDER } from "@/lib/image-utils";
import { getEditorSenha } from "@/lib/editor-auth";
import { EditorPasswordForm } from "@/components/shared/EditorPasswordForm";
import { useEditorMode } from "@/lib/useEditorMode";
import { cn } from "@/lib/utils";

const EQUIPE_OPTIONS: Equipe[] = ["Elétrica", "Mecânica", "Instrumentação", "Operação", "Segurança", "Civil", "Caldeiraria", "Preditiva"];
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

function EtapaDot({
  preenchida,
  selecionada,
  horario,
  label,
  onClick,
}: {
  preenchida: boolean;
  selecionada: boolean;
  horario?: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-1 flex-col items-center gap-1 rounded-lg py-2 transition-colors",
        selecionada ? "bg-brand-100 ring-2 ring-brand-400" : preenchida ? "bg-success-100" : "bg-slate-100 hover:bg-slate-200"
      )}
    >
      <div
        className={cn(
          "flex h-6 w-6 items-center justify-center rounded-full",
          selecionada ? "bg-brand-600 text-white" : preenchida ? "bg-success-600 text-white" : "bg-slate-300 text-slate-500"
        )}
      >
        {preenchida ? <Check size={13} /> : <span className="text-[10px] font-bold">·</span>}
      </div>
      <p className={cn("text-[10px] font-bold uppercase", selecionada ? "text-brand-700" : preenchida ? "text-success-700" : "text-slate-400")}>{label}</p>
      {horario && <p className="text-[10px] font-mono font-semibold text-success-600">{horario}</p>}
    </button>
  );
}

const MARCOS_TIMELINE: Array<{ titulo: string; icone: TimelineEvento["icone"]; Icon: typeof Flag }> = [
  { titulo: "Início da Parada", icone: "play", Icon: Play },
  { titulo: "Bloqueio", icone: "lock", Icon: Lock },
  { titulo: "Liberação", icone: "unlock", Icon: Unlock },
  { titulo: "Partida", icone: "flag", Icon: Flag },
];

function NovoEventoForm({ paradaId, onCriado }: { paradaId: string; onCriado: (evento: TimelineEvento) => void }) {
  const [aberto, setAberto] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [icone, setIcone] = useState<TimelineEvento["icone"]>("flag");
  const [responsavel, setResponsavel] = useState("");
  const [descricao, setDescricao] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  async function handleSalvar() {
    if (!titulo.trim()) {
      setErro("Escolha ou digite o evento.");
      return;
    }
    setErro("");
    setLoading(true);
    try {
      const resultado = await adicionarEventoRapido(paradaId, { titulo, responsavel, descricao, icone }, getEditorSenha());
      if (!resultado.ok || !resultado.evento) {
        setErro(resultado.erro || "Não foi possível marcar o evento.");
        return;
      }
      onCriado(resultado.evento);
      setTitulo("");
      setDescricao("");
      setAberto(false);
    } catch {
      setErro("Não foi possível marcar o evento. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-white px-4 py-4 text-sm font-bold text-slate-500 transition-colors hover:border-brand-400 hover:text-brand-600"
      >
        <Flag size={18} />
        Marcar Evento da Timeline
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-brand-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900">Marcar Evento</h3>
        <button type="button" onClick={() => setAberto(false)} className="text-slate-400">
          <ChevronDown size={18} />
        </button>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2">
        {MARCOS_TIMELINE.map((marco) => (
          <button
            key={marco.titulo}
            type="button"
            onClick={() => {
              setTitulo(marco.titulo);
              setIcone(marco.icone);
            }}
            className={cn(
              "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold transition-colors",
              titulo === marco.titulo ? "border-brand-400 bg-brand-50 text-brand-700" : "border-slate-200 text-slate-500 hover:bg-slate-50"
            )}
          >
            <marco.Icon size={15} />
            {marco.titulo}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">Evento</label>
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ou digite um evento diferente"
            className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">Responsável (opcional)</label>
          <input
            value={responsavel}
            onChange={(e) => setResponsavel(e.target.value)}
            placeholder="Quem fez/autorizou"
            className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">Descrição (opcional)</label>
          <textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            rows={2}
            placeholder="Detalhe rápido, se precisar"
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
        {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
        {loading ? "Salvando..." : "Marcar Agora"}
      </button>
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
  // Etapa escolhida manualmente pelo usuário — se nulo, usa a próxima vazia
  // (Antes -> Depois -> Durante) como sugestão automática.
  const [etapaEscolhida, setEtapaEscolhida] = useState<"Antes" | "Durante" | "Depois" | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  const temAntes = !!servico.fotoAntes && servico.fotoAntes !== NO_PHOTO_PLACEHOLDER;
  const temDurante = !!servico.fotoDurante;
  const temDepois = !!servico.fotoDepois && servico.fotoDepois !== NO_PHOTO_PLACEHOLDER;

  const etapaSugerida: "Antes" | "Durante" | "Depois" = !temAntes ? "Antes" : !temDepois ? "Depois" : !temDurante ? "Durante" : "Depois";
  const etapaAtiva = etapaEscolhida ?? etapaSugerida;

  async function enviar(blob: Blob, nome: string, etapa: "Antes" | "Durante" | "Depois", tentativas = 3) {
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

      const resultado = await capturarFotoServico(paradaId, servico.id, upload.url, senha, etapa);
      if (!resultado.ok) {
        setPendente(null);
        setErro(resultado.erro || "Não foi possível registrar a foto.");
        return;
      }

      setPendente(null);
      setEtapaEscolhida(null);
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
      await enviar(comprimido, file.name, etapaAtiva);
    } catch {
      setErro("Não foi possível processar a foto. Tente novamente.");
      setLoading(false);
    }
  }

  function handleTentarNovamente() {
    if (pendente) enviar(pendente.blob, pendente.nome, etapaAtiva);
  }

  const concluido = servico.status === "concluido";

  async function handleToggleStatus() {
    setStatusLoading(true);
    try {
      const novoStatus = concluido ? "pendente" : "concluido";
      const resultado = await marcarStatusServico(paradaId, servico.id, novoStatus, getEditorSenha());
      if (resultado.ok) onCaptured(servico.id, { status: novoStatus });
    } finally {
      setStatusLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <input ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wide text-brand-600">
            OS {servico.numeroOS} · {servico.area}
          </p>
          {/* O que precisa ser feito é a informação que realmente diferencia uma
              OS da outra em campo — o equipamento sozinho costuma ser um código
              técnico genérico que não diz nada de cara. */}
          <h3 className="mt-0.5 text-base font-bold leading-snug text-slate-900">{servico.problemaIdentificado}</h3>
          <p className="mt-0.5 text-xs text-slate-400">{servico.equipamento}</p>
          {/* Nome de quem é responsável, sempre visível — é o que permite ir
              direto falar com a pessoa certa em vez de só saber a equipe. */}
          {servico.responsavel && (
            <p className="mt-1.5 flex items-center gap-1.5 text-sm font-bold text-brand-700">
              <User size={13} className="flex-none" />
              {servico.responsavel}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={handleToggleStatus}
          disabled={statusLoading}
          className={cn(
            "flex flex-none items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold uppercase transition-colors disabled:opacity-60",
            concluido ? "bg-success-100 text-success-700" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
          )}
        >
          {statusLoading ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
          {concluido ? "Concluído" : "Pendente"}
        </button>
      </div>

      <p className="mt-3 text-[10px] font-bold uppercase tracking-wide text-slate-400">Toque para escolher a etapa da foto</p>
      <div className="mt-1.5 flex gap-2">
        <EtapaDot preenchida={temAntes} selecionada={etapaAtiva === "Antes"} horario={servico.fotoAntesHorario} label="Antes" onClick={() => setEtapaEscolhida("Antes")} />
        <EtapaDot preenchida={temDurante} selecionada={etapaAtiva === "Durante"} horario={servico.fotoDuranteHorario} label="Durante" onClick={() => setEtapaEscolhida("Durante")} />
        <EtapaDot preenchida={temDepois} selecionada={etapaAtiva === "Depois"} horario={servico.fotoDepoisHorario} label="Depois" onClick={() => setEtapaEscolhida("Depois")} />
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
          {loading ? "Enviando..." : `Tirar Foto — ${etapaAtiva}`}
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

// Falta pelo menos a foto de Antes ou Depois — as duas que realmente contam
// pra fechar o registro (Durante é opcional). Usado tanto pra ordenar a lista
// quanto pro contador do topo.
function faltaFoto(servico: Servico): boolean {
  const temAntes = !!servico.fotoAntes && servico.fotoAntes !== NO_PHOTO_PLACEHOLDER;
  const temDepois = !!servico.fotoDepois && servico.fotoDepois !== NO_PHOTO_PLACEHOLDER;
  return !temAntes || !temDepois;
}

function CapturaRapidaConteudo({ id }: { id: string }) {
  const [data, setData] = useState<ParadaCompleta | null>(null);
  const [status, setStatus] = useState<"loading" | "found" | "not-found">("loading");
  const [atualizando, setAtualizando] = useState(false);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date | null>(null);
  const [horaAgora, setHoraAgora] = useState<Date | null>(null);
  const [busca, setBusca] = useState("");

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

  // As que ainda faltam foto vêm primeiro — quem está em campo tirando foto
  // enxerga de cara o que falta, em vez de rolar a lista toda procurando.
  const servicosOrdenados = useMemo(() => {
    if (!data) return [];
    return [...data.servicos].sort((a, b) => Number(faltaFoto(b)) - Number(faltaFoto(a)));
  }, [data]);
  const pendentesCount = data ? data.servicos.filter(faltaFoto).length : 0;
  const totalServicos = data?.servicos.length ?? 0;
  const concluidasCount = data ? data.servicos.filter((s) => s.status === "concluido").length : 0;
  const percConcluido = totalServicos > 0 ? Math.round((concluidasCount / totalServicos) * 100) : 0;

  const servicosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return servicosOrdenados;
    return servicosOrdenados.filter(
      (s) =>
        s.numeroOS.toLowerCase().includes(termo) ||
        s.equipamento.toLowerCase().includes(termo) ||
        s.titulo.toLowerCase().includes(termo) ||
        s.problemaIdentificado.toLowerCase().includes(termo) ||
        s.responsavel.toLowerCase().includes(termo)
    );
  }, [servicosOrdenados, busca]);

  function handleCaptured(servicoId: string, patch: Partial<Servico>) {
    setData((prev) => {
      if (!prev) return prev;
      return { ...prev, servicos: prev.servicos.map((s) => (s.id === servicoId ? { ...s, ...patch } : s)) };
    });
  }

  function handleOsCriada(servico: Servico) {
    setData((prev) => (prev ? { ...prev, servicos: [...prev.servicos, servico] } : prev));
  }

  function handleEventoCriado(evento: TimelineEvento) {
    setData((prev) => (prev ? { ...prev, timeline: [...prev.timeline, evento] } : prev));
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
          {pendentesCount > 0 && (
            <span className="flex-none rounded-full bg-warning-100 px-3 py-1.5 text-xs font-bold text-warning-600">
              {pendentesCount} sem foto
            </span>
          )}
        </div>
        {totalServicos > 0 && (
          <div className="px-4 pb-3">
            <div className="mb-1 flex items-center justify-between text-[11px] font-bold text-slate-500">
              <span>
                {concluidasCount}/{totalServicos} OS concluídas
              </span>
              <span>{percConcluido}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-success-600 transition-all" style={{ width: `${percConcluido}%` }} />
            </div>
          </div>
        )}
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
        <NovoEventoForm paradaId={id} onCriado={handleEventoCriado} />

        {totalServicos > 0 && (
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por OS, equipamento ou responsável"
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-9 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            />
            {busca && (
              <button
                type="button"
                onClick={() => setBusca("")}
                aria-label="Limpar busca"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={15} />
              </button>
            )}
          </div>
        )}

        {data.servicos.length === 0 ? (
          <p className="py-16 text-center text-sm text-slate-400">Nenhuma OS cadastrada ainda neste relatório.</p>
        ) : servicosFiltrados.length === 0 ? (
          <p className="py-16 text-center text-sm text-slate-400">Nenhuma OS encontrada para &quot;{busca}&quot;.</p>
        ) : (
          servicosFiltrados.map((servico) => <ServicoCapturaCard key={servico.id} paradaId={id} servico={servico} onCaptured={handleCaptured} />)
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
