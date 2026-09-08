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
  CloudOff,
  Eye,
  EyeOff,
  Flag,
  Loader2,
  Lock,
  Play,
  Plus,
  RefreshCw,
  Search,
  Unlock,
  User,
  WifiOff,
  X,
} from "lucide-react";
import type { Equipe, ParadaCompleta, Servico, StatusItem, TimelineEvento } from "@/lib/types";
import { getParadaCompleta, capturarFotoServico, uploadFoto, adicionarServicoRapido, adicionarEventoRapido, marcarStatusServico } from "@/lib/actions/paradas";
import { compressImageFile, NO_PHOTO_PLACEHOLDER } from "@/lib/image-utils";
import { EditorPasswordForm } from "@/components/shared/EditorPasswordForm";
import { useEditorMode } from "@/lib/useEditorMode";
import { cn, pareceNomeDePessoa } from "@/lib/utils";
import { type FotoPendente, listarFotosPendentes, removerFotoPendente, salvarFotoPendente } from "@/lib/offline-fotos";

// As 3 opções que fazem sentido marcar em campo pelo celular — "Atrasado" é
// mais um estado de relatório do que algo que alguém marca na hora.
const STATUS_OPCOES: Array<{ value: StatusItem; label: string; ativoClasse: string }> = [
  { value: "pendente", label: "Pendente", ativoClasse: "bg-slate-200 text-slate-700" },
  { value: "em_andamento", label: "Em Andamento", ativoClasse: "bg-brand-100 text-brand-700" },
  { value: "concluido", label: "Concluído", ativoClasse: "bg-success-100 text-success-700" },
];

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
        { numeroOS, equipamento, area: "", responsavel: "", equipe, categoria, motivo }
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
      const resultado = await adicionarEventoRapido(paradaId, { titulo, responsavel, descricao, icone });
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
  pendentesDoServico,
  onEnfileirar,
}: {
  paradaId: string;
  servico: Servico;
  onCaptured: (servicoId: string, patch: Partial<Servico>) => void;
  pendentesDoServico: FotoPendente[];
  onEnfileirar: (servicoId: string, etapa: "Antes" | "Durante" | "Depois", blob: Blob, nomeArquivo: string) => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [ultimoResultado, setUltimoResultado] = useState("");
  // Etapa escolhida manualmente pelo usuário — se nulo, usa a próxima vazia
  // (Antes -> Depois -> Durante) como sugestão automática.
  const [etapaEscolhida, setEtapaEscolhida] = useState<"Antes" | "Durante" | "Depois" | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  const temAntes = !!servico.fotoAntes && servico.fotoAntes !== NO_PHOTO_PLACEHOLDER;
  const temDurante = !!servico.fotoDurante;
  const temDepois = !!servico.fotoDepois && servico.fotoDepois !== NO_PHOTO_PLACEHOLDER;

  const etapaSugerida: "Antes" | "Durante" | "Depois" = !temAntes ? "Antes" : !temDepois ? "Depois" : !temDurante ? "Durante" : "Depois";
  const etapaAtiva = etapaEscolhida ?? etapaSugerida;

  // Sem internet, nem tenta — vai direto pra fila (evita 3 tentativas de
  // rede fadadas ao erro, que só atrasam e gastam bateria à toa em campo).
  async function enviar(blob: Blob, nome: string, etapa: "Antes" | "Durante" | "Depois", tentativas = 3) {
    setErro("");
    setUltimoResultado("");
    setLoading(true);
    try {
      if (!navigator.onLine) {
        await onEnfileirar(servico.id, etapa, blob, nome);
        setEtapaEscolhida(null);
        setUltimoResultado("Sem internet — foto guardada no aparelho, envia sozinha quando a conexão voltar.");
        return;
      }

      const formData = new FormData();
      formData.set("file", blob, nome);

      let upload: Awaited<ReturnType<typeof uploadFoto>> | null = null;
      for (let tentativa = 1; tentativa <= tentativas; tentativa++) {
        try {
          upload = await uploadFoto(formData);
          if (upload.ok) break;
        } catch {
          upload = null;
        }
        if (tentativa < tentativas) await new Promise((r) => setTimeout(r, 1200 * tentativa));
      }

      if (!upload || !upload.ok || !upload.url) {
        await onEnfileirar(servico.id, etapa, blob, nome);
        setEtapaEscolhida(null);
        setUltimoResultado("Sinal fraco — foto guardada no aparelho, envia sozinha quando a conexão voltar.");
        return;
      }

      const resultado = await capturarFotoServico(paradaId, servico.id, upload.url, etapa);
      if (!resultado.ok) {
        setErro(resultado.erro || "Não foi possível registrar a foto.");
        return;
      }

      setEtapaEscolhida(null);
      const campo = resultado.label === "Antes" ? "fotoAntes" : resultado.label === "Durante" ? "fotoDurante" : "fotoDepois";
      const horarioCampo = resultado.label === "Antes" ? "fotoAntesHorario" : resultado.label === "Durante" ? "fotoDuranteHorario" : "fotoDepoisHorario";
      onCaptured(servico.id, {
        [campo]: upload.url,
        [horarioCampo]: resultado.horario,
        ...(resultado.statusFechado ? { status: resultado.statusFechado } : {}),
      } as Partial<Servico>);
      setUltimoResultado(
        resultado.statusFechado
          ? `Registrada como "${resultado.label}" às ${resultado.horario} — OS concluída automaticamente`
          : `Registrada como "${resultado.label}" às ${resultado.horario}`
      );
    } catch {
      await onEnfileirar(servico.id, etapa, blob, nome);
      setEtapaEscolhida(null);
      setUltimoResultado("Sem internet — foto guardada no aparelho, envia sozinha quando a conexão voltar.");
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

  async function handleAlterarStatus(novoStatus: StatusItem) {
    if (novoStatus === servico.status) return;
    setStatusLoading(true);
    try {
      const resultado = await marcarStatusServico(paradaId, servico.id, novoStatus);
      if (resultado.ok) onCaptured(servico.id, { status: novoStatus });
    } finally {
      setStatusLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      {/* Sem "capture" de propósito: assim o celular mostra a opção de tirar
          foto NA HORA ou escolher uma já tirada antes (útil quando a foto foi
          tirada num momento sem internet e só agora dá pra anexar). */}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
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
        {servico.responsavel && pareceNomeDePessoa(servico.responsavel) && (
          <p className="mt-1.5 flex items-center gap-1.5 text-sm font-bold text-brand-700">
            <User size={13} className="flex-none" />
            {servico.responsavel}
          </p>
        )}
      </div>

      {/* 3 estados em vez de um toggle liga/desliga — em campo o serviço
          passa por "Em Andamento" antes de ficar pronto, e isso precisa
          aparecer, não só "Pendente" vs "Concluído". */}
      <div className="mt-3 flex gap-1.5">
        {STATUS_OPCOES.map((opcao) => (
          <button
            key={opcao.value}
            type="button"
            onClick={() => handleAlterarStatus(opcao.value)}
            disabled={statusLoading}
            className={cn(
              "flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-bold uppercase transition-colors disabled:opacity-60",
              servico.status === opcao.value ? opcao.ativoClasse : "bg-slate-50 text-slate-400 hover:bg-slate-100"
            )}
          >
            {servico.status === opcao.value && <Check size={11} />}
            {opcao.label}
          </button>
        ))}
      </div>

      <p className="mt-3 text-[10px] font-bold uppercase tracking-wide text-slate-400">Toque para escolher a etapa da foto</p>
      <div className="mt-1.5 flex gap-2">
        <EtapaDot preenchida={temAntes} selecionada={etapaAtiva === "Antes"} horario={servico.fotoAntesHorario} label="Antes" onClick={() => setEtapaEscolhida("Antes")} />
        <EtapaDot preenchida={temDurante} selecionada={etapaAtiva === "Durante"} horario={servico.fotoDuranteHorario} label="Durante" onClick={() => setEtapaEscolhida("Durante")} />
        <EtapaDot preenchida={temDepois} selecionada={etapaAtiva === "Depois"} horario={servico.fotoDepoisHorario} label="Depois" onClick={() => setEtapaEscolhida("Depois")} />
      </div>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3.5 text-sm font-bold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
      >
        {loading ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
        {loading ? "Enviando..." : `Tirar Foto — ${etapaAtiva}`}
      </button>

      {pendentesDoServico.length > 0 && (
        <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-xs font-semibold text-warning-700">
          <WifiOff size={13} className="flex-none" />
          {pendentesDoServico.length} foto{pendentesDoServico.length > 1 ? "s" : ""} guardada{pendentesDoServico.length > 1 ? "s" : ""} sem internet — envia sozinha quando voltar a conexão
        </p>
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
  // OS concluída fica fora da lista por padrão — com muitas OS na parada,
  // a lista inteira de "já feito" só atrapalha achar o que ainda falta.
  const [mostrarConcluidas, setMostrarConcluidas] = useState(false);
  // Fotos tiradas sem internet ficam guardadas no aparelho (IndexedDB) até
  // a conexão voltar — isso é o que sobrevive a fechar o app/trocar de tela,
  // diferente de só guardar em memória do componente.
  const [filaPendente, setFilaPendente] = useState<FotoPendente[]>([]);
  const [enviandoFila, setEnviandoFila] = useState(false);

  // Sem nenhum setState síncrono no início — assim dá pra chamar direto no
  // corpo de um efeito (carga inicial, atualização em segundo plano) sem
  // disparar um render extra fora do fluxo normal do React. Quem precisa
  // mostrar spinner (o botão de atualizar manual) usa atualizarComSpinner.
  async function carregar() {
    const res = await getParadaCompleta(id);
    if (res) {
      setData(res);
      setStatus("found");
      setUltimaAtualizacao(new Date());
    } else {
      setStatus("not-found");
    }
  }

  async function atualizarComSpinner() {
    setAtualizando(true);
    try {
      await carregar();
    } finally {
      setAtualizando(false);
    }
  }

  // Tenta enviar tudo que ficou guardado no aparelho por falta de conexão.
  // Cada foto é tentada de forma independente — uma falhar não impede as
  // outras de irem, e o que não for enviado continua na fila pra próxima vez.
  async function tentarEnviarFila() {
    if (enviandoFila) return;
    setEnviandoFila(true);
    try {
      const itens = await listarFotosPendentes(id);
      if (itens.length === 0) {
        setFilaPendente([]);
        return;
      }
      const restantes: FotoPendente[] = [];
      for (const item of itens) {
        try {
          const formData = new FormData();
          formData.set("file", item.blob, item.nomeArquivo);
          const upload = await uploadFoto(formData);
          if (!upload.ok || !upload.url) {
            restantes.push(item);
            continue;
          }
          const resultado = await capturarFotoServico(id, item.servicoId, upload.url, item.etapa);
          if (!resultado.ok) {
            restantes.push(item);
            continue;
          }
          await removerFotoPendente(item.id);
          const campo = resultado.label === "Antes" ? "fotoAntes" : resultado.label === "Durante" ? "fotoDurante" : "fotoDepois";
          const horarioCampo = resultado.label === "Antes" ? "fotoAntesHorario" : resultado.label === "Durante" ? "fotoDuranteHorario" : "fotoDepoisHorario";
          handleCaptured(item.servicoId, {
            [campo]: upload.url,
            [horarioCampo]: resultado.horario,
            ...(resultado.statusFechado ? { status: resultado.statusFechado } : {}),
          } as Partial<Servico>);
        } catch {
          restantes.push(item);
        }
      }
      setFilaPendente(restantes);
    } finally {
      setEnviandoFila(false);
    }
  }

  // Chamado pelo card de cada OS quando não dá pra enviar a foto na hora
  // (sem internet, ou o envio falhou) — guarda no aparelho e some da tela;
  // essa mesma fila é reprocessada sozinha quando a conexão voltar.
  async function enfileirarFoto(servicoId: string, etapa: "Antes" | "Durante" | "Depois", blob: Blob, nomeArquivo: string) {
    const item: FotoPendente = { id: crypto.randomUUID(), paradaId: id, servicoId, etapa, nomeArquivo, blob, criadoEm: Date.now() };
    await salvarFotoPendente(item);
    setFilaPendente((prev) => [...prev, item]);
    if (navigator.onLine) tentarEnviarFila();
  }

  useEffect(() => {
    void (async () => {
      await tentarEnviarFila();
    })();

    function onOnline() {
      tentarEnviarFila();
    }
    window.addEventListener("online", onOnline);
    // Além do evento "online" (que alguns celulares disparam com atraso ou
    // não disparam de forma confiável em wi-fi instável), tenta de novo a
    // cada 20s enquanto o navegador achar que está conectado.
    const intervaloFila = setInterval(() => {
      if (navigator.onLine) tentarEnviarFila();
    }, 20000);

    return () => {
      window.removeEventListener("online", onOnline);
      clearInterval(intervaloFila);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    void (async () => {
      await carregar();
    })();

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

  // "responsavel" costuma vir como dupla/trio ("ADELINO + JEBERSON") — quebra
  // em cada pessoa e pega só o primeiro nome, pra virar um chip curto que dá
  // pra tocar direto em vez de digitar. Um nome por pessoa (sem repetir).
  // A planilha às vezes traz lixo nessa coluna (número de turno, célula com
  // erro de acentuação virando "?????") — só vira chip o que parece nome de
  // gente de verdade (letras, pelo menos 2 caracteres).
  const pessoas = useMemo(() => {
    const vistos = new Map<string, string>();
    for (const s of servicosOrdenados) {
      for (const parte of s.responsavel.split(/\s*\+\s*/)) {
        const primeiroNome = parte.trim().split(/\s+/)[0];
        if (!primeiroNome || !pareceNomeDePessoa(primeiroNome)) continue;
        const chave = primeiroNome.toLowerCase();
        if (!vistos.has(chave)) vistos.set(chave, primeiroNome);
      }
    }
    return Array.from(vistos.values()).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [servicosOrdenados]);

  const servicosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const base = termo
      ? servicosOrdenados.filter(
          (s) =>
            s.numeroOS.toLowerCase().includes(termo) ||
            s.equipamento.toLowerCase().includes(termo) ||
            s.titulo.toLowerCase().includes(termo) ||
            s.problemaIdentificado.toLowerCase().includes(termo) ||
            s.responsavel.toLowerCase().includes(termo)
        )
      : servicosOrdenados;
    // Uma busca digitada vale mais que o filtro de "esconder concluídas" —
    // se a pessoa está procurando uma OS específica, ela aparece mesmo já
    // pronta, senão a busca "falha" sem motivo aparente.
    if (termo || mostrarConcluidas) return base;
    return base.filter((s) => s.status !== "concluido");
  }, [servicosOrdenados, busca, mostrarConcluidas]);

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
          onClick={() => atualizarComSpinner()}
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

      {filaPendente.length > 0 && (
        // Fica visível o tempo todo — é a garantia de que a foto não foi
        // perdida, só está esperando internet pra subir sozinha.
        <div className="flex items-center gap-2.5 border-b border-warning-200 bg-warning-50 px-4 py-2.5 text-xs font-bold text-warning-700">
          {enviandoFila ? <Loader2 size={14} className="flex-none animate-spin" /> : <CloudOff size={14} className="flex-none" />}
          {enviandoFila
            ? `Enviando ${filaPendente.length} foto${filaPendente.length > 1 ? "s" : ""} guardada${filaPendente.length > 1 ? "s" : ""}...`
            : `${filaPendente.length} foto${filaPendente.length > 1 ? "s" : ""} guardada${filaPendente.length > 1 ? "s" : ""} no aparelho, aguardando internet para enviar`}
        </div>
      )}

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

        {concluidasCount > 0 && (
          <button
            type="button"
            onClick={() => setMostrarConcluidas((v) => !v)}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-200 bg-white py-2 text-xs font-bold text-slate-500 transition-colors hover:bg-slate-50"
          >
            {mostrarConcluidas ? <EyeOff size={13} /> : <Eye size={13} />}
            {mostrarConcluidas ? `Ocultar ${concluidasCount} concluída${concluidasCount > 1 ? "s" : ""}` : `Mostrar ${concluidasCount} concluída${concluidasCount > 1 ? "s" : ""}`}
          </button>
        )}

        {pessoas.length > 0 && (
          // Um toque no nome já filtra — evita digitar no celular. Toca de
          // novo no mesmo nome (já selecionado) pra limpar o filtro.
          <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4">
            {pessoas.map((nome) => {
              const ativo = busca.trim().toLowerCase() === nome.toLowerCase();
              return (
                <button
                  key={nome}
                  type="button"
                  onClick={() => setBusca(ativo ? "" : nome)}
                  className={cn(
                    "flex-none rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors",
                    ativo ? "border-brand-600 bg-brand-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  )}
                >
                  {nome}
                </button>
              );
            })}
          </div>
        )}

        {data.servicos.length === 0 ? (
          <p className="py-16 text-center text-sm text-slate-400">Nenhuma OS cadastrada ainda neste relatório.</p>
        ) : servicosFiltrados.length === 0 ? (
          <p className="py-16 text-center text-sm text-slate-400">
            {busca ? (
              <>Nenhuma OS encontrada para &quot;{busca}&quot;.</>
            ) : (
              <>
                Todas as OS estão concluídas. Toque em &quot;Mostrar {concluidasCount} concluída{concluidasCount > 1 ? "s" : ""}&quot; acima pra ver.
              </>
            )}
          </p>
        ) : (
          servicosFiltrados.map((servico) => (
            <ServicoCapturaCard
              key={servico.id}
              paradaId={id}
              servico={servico}
              onCaptured={handleCaptured}
              pendentesDoServico={filaPendente.filter((f) => f.servicoId === servico.id)}
              onEnfileirar={enfileirarFoto}
            />
          ))
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
