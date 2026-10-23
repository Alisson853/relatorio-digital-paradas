"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
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
  Square,
  CheckSquare,
  Unlock,
  User,
  WifiOff,
  X,
  ClipboardList,
  Copy,
  CalendarRange,
  Mic,
} from "lucide-react";
import { MOTIVOS_NAO_FEITO, type Equipe, type MotivoNaoFeitoCategoria, type ParadaCompleta, type Servico, type StatusItem, type TimelineEvento } from "@/lib/types";
import {
  getParadaCompleta,
  capturarFotoServico,
  uploadFoto,
  uploadAudio,
  salvarAudioServico,
  adicionarServicoRapido,
  adicionarEventoRapido,
  marcarStatusServico,
  definirNaoFeito,
  listHistoricoNaoFeito,
} from "@/lib/actions/paradas";
import { compressImageFile, NO_PHOTO_PLACEHOLDER } from "@/lib/image-utils";
import { EditorPasswordForm } from "@/components/shared/EditorPasswordForm";
import { useEditorMode } from "@/lib/useEditorMode";
import { useConectividade } from "@/lib/useConectividade";
import { cn, formatDateCompact, pareceNomeDePessoa } from "@/lib/utils";
import { chaveFotoPendente, type FotoPendente, listarFotosPendentes, removerFotoPendente, salvarFotoPendente } from "@/lib/offline-fotos";
import { atualizarItemNaoFeito, type NaoFeitoPendente, listarNaoFeitoPendente, removerNaoFeitoPendente, salvarNaoFeitoPendente } from "@/lib/offline-nao-feito";
import { atualizarItemStatus, type StatusPendente, listarStatusPendente, removerStatusPendente, salvarStatusPendente } from "@/lib/offline-status";
import { processarFila, type ResultadoTentativa } from "@/lib/offline-sync";
import { carregarParadaCache, salvarParadaCache } from "@/lib/offline-parada-cache";
import { encontrarUltimoNaoFeito, type HistoricoNaoFeitoItem } from "@/lib/historico-nao-feito";
import { parseHoras } from "@/lib/derive";
import { formatarHorario, servicosProgramados } from "@/lib/programacao";
import { sessaoAtiva } from "@/lib/actions/auth";

// As 3 opções que fazem sentido marcar em campo pelo celular — "Atrasado" é
// mais um estado de relatório do que algo que alguém marca na hora.
const STATUS_OPCOES: Array<{ value: StatusItem; label: string; ativoClasse: string }> = [
  { value: "pendente", label: "Pendente", ativoClasse: "bg-slate-200 text-slate-700" },
  { value: "em_andamento", label: "Em Andamento", ativoClasse: "bg-brand-100 text-brand-700" },
  { value: "concluido", label: "Concluído", ativoClasse: "bg-success-100 text-success-700" },
];

const EQUIPE_OPTIONS: Equipe[] = ["Elétrica", "Mecânica", "Instrumentação", "Operação", "Segurança", "Civil", "Caldeiraria", "Preditiva", "Lubrificação"];
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
  // Bloco F: guarda síncrona contra duplo-toque. `loading` (state) só reflete
  // na tela — e no atributo `disabled` do botão — depois que o React
  // re-renderiza; num toque duplo rápido no celular, o segundo toque pode
  // chegar ANTES desse re-render e cair no mesmo `handleSalvar` com
  // `loading` ainda lido como false, criando uma segunda OS igual à
  // primeira. Ref é síncrona: a segunda chamada vê `true` na hora.
  const submetendoRef = useRef(false);

  async function handleSalvar() {
    if (submetendoRef.current) return;
    if (!equipamento.trim()) {
      setErro("Informe o equipamento.");
      return;
    }
    submetendoRef.current = true;
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
      submetendoRef.current = false;
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
        <button
          type="button"
          onClick={() => setAberto(false)}
          aria-label="Fechar"
          className="-mr-1.5 flex h-9 w-9 items-center justify-center rounded-full text-slate-400 active:bg-slate-100"
        >
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

// Uma das tres etapas da foto (Antes / Durante / Depois).
//
// O desenho anterior misturava duas informacoes diferentes no mesmo lugar e da
// mesma forma: "esta etapa ja tem foto" pintava o fundo de verde-claro, e
// "e nesta que a proxima foto vai entrar" pintava de azul-claro. Dois fundos
// pastel lado a lado, com a mesma forca visual, para dois significados que nao
// tem nada a ver um com o outro — em campo, no sol, isso vira ruido.
//
// Agora "tem foto" e um estado do conteudo (o visto verde e o horario), e
// "selecionada" e um estado da acao (borda azul cheia). Um nao mascara o
// outro: da pra ver uma etapa que ja tem foto E esta selecionada, que e
// justamente o caso de substituir uma foto ruim, antes impossivel de perceber.
function EtapaDot({
  preenchida,
  selecionada,
  horario,
  label,
  opcional,
  onClick,
}: {
  preenchida: boolean;
  selecionada: boolean;
  horario?: string;
  label: string;
  opcional?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selecionada}
      className={cn(
        "flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg border-2 py-2 transition-colors",
        selecionada ? "border-brand-600 bg-brand-50" : "border-transparent bg-slate-100 hover:bg-slate-200"
      )}
    >
      <div className="flex items-center gap-1">
        {preenchida ? (
          <Check size={13} className="text-success-600" />
        ) : (
          <span className={cn("h-1.5 w-1.5 rounded-full", selecionada ? "bg-brand-600" : "bg-slate-300")} />
        )}
        <p className={cn("text-[10px] font-bold uppercase", selecionada ? "text-brand-700" : preenchida ? "text-success-700" : "text-slate-500")}>
          {label}
        </p>
      </div>
      {horario ? (
        <p className="font-mono text-[10px] font-semibold text-success-600">{horario}</p>
      ) : opcional ? (
        // Sem isto, a etapa do meio parece uma lacuna a preencher, e o pulo
        // automatico de "Antes" direto pra "Depois" parece defeito. Dizer que
        // ela e opcional explica o pulo antes de ele acontecer.
        <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">opcional</p>
      ) : (
        <p className="text-[10px] text-slate-400">—</p>
      )}
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
  // Bloco F: mesma guarda síncrona contra duplo-toque de NovaOsForm acima —
  // ver o comentário lá.
  const submetendoRef = useRef(false);

  async function handleSalvar() {
    if (submetendoRef.current) return;
    if (!titulo.trim()) {
      setErro("Escolha ou digite o evento.");
      return;
    }
    submetendoRef.current = true;
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
      submetendoRef.current = false;
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
        <button
          type="button"
          onClick={() => setAberto(false)}
          aria-label="Fechar"
          className="-mr-1.5 flex h-9 w-9 items-center justify-center rounded-full text-slate-400 active:bg-slate-100"
        >
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
  pendenteNaoFeito,
  onEnfileirarNaoFeito,
  pendenteStatus,
  onEnfileirarStatus,
  historicoNaoFeito,
}: {
  paradaId: string;
  servico: Servico;
  onCaptured: (servicoId: string, patch: Partial<Servico>) => void;
  pendentesDoServico: FotoPendente[];
  onEnfileirar: (servicoId: string, etapa: "Antes" | "Durante" | "Depois", blob: Blob, nomeArquivo: string) => Promise<void>;
  pendenteNaoFeito: boolean;
  onEnfileirarNaoFeito: (servicoId: string, categoria: MotivoNaoFeitoCategoria | "", justificativa: string) => Promise<void>;
  pendenteStatus: boolean;
  onEnfileirarStatus: (servicoId: string, novoStatus: StatusItem) => Promise<void>;
  historicoNaoFeito: HistoricoNaoFeitoItem | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [ultimoResultado, setUltimoResultado] = useState("");
  // Etapa escolhida manualmente pelo usuário — se nulo, usa a próxima vazia
  // (Antes -> Depois -> Durante) como sugestão automática.
  const [etapaEscolhida, setEtapaEscolhida] = useState<"Antes" | "Durante" | "Depois" | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [naoFeitoAberto, setNaoFeitoAberto] = useState(!!servico.naoFeitoCategoria);
  const [categoria, setCategoria] = useState<MotivoNaoFeitoCategoria | "">(servico.naoFeitoCategoria ?? "");
  const [justificativa, setJustificativa] = useState(servico.justificativaNaoFeito ?? "");
  const [salvandoNaoFeito, setSalvandoNaoFeito] = useState(false);
  const [gravando, setGravando] = useState(false);
  const [audioErro, setAudioErro] = useState("");
  const gravadorRef = useRef<MediaRecorder | null>(null);
  const partesAudioRef = useRef<Blob[]>([]);
  // O que já foi confirmado salvo (no servidor OU na fila offline) — não usa
  // os props do servico direto porque eles só refletem a gravação depois que
  // o round-trip do servidor volta e o pai atualiza o estado; entre um
  // salvamento e essa volta, comparar contra o prop faria o efeito de
  // auto-save de baixo achar que ainda há mudança pendente e disparar uma
  // segunda gravação redundante.
  const lastSavedRef = useRef<{ categoria: MotivoNaoFeitoCategoria | ""; justificativa: string }>({
    categoria: servico.naoFeitoCategoria ?? "",
    justificativa: servico.justificativaNaoFeito ?? "",
  });

  const temAntes = !!servico.fotoAntes && servico.fotoAntes !== NO_PHOTO_PLACEHOLDER;
  const temDurante = !!servico.fotoDurante;
  const temDepois = !!servico.fotoDepois && servico.fotoDepois !== NO_PHOTO_PLACEHOLDER;

  // Caminho padrão da evidência: Antes → Durante → Depois. "Depois" pode
  // ser escolhido a qualquer momento nos marcadores quando a foto inicial
  // não for possível; ela ainda conclui a OS mesmo offline.
  const etapaSugerida: "Antes" | "Durante" | "Depois" = !temAntes ? "Antes" : !temDurante ? "Durante" : "Depois";
  const etapaAtiva = etapaEscolhida ?? etapaSugerida;
  // Se a etapa que esta valendo ja tem foto, a proxima captura sobrescreve.
  // Isso precisa estar dito ANTES do toque, nao descoberto depois.
  const jaTemFotoNaEtapaAtiva =
    etapaAtiva === "Antes" ? temAntes : etapaAtiva === "Durante" ? temDurante : temDepois;

  async function alternarAudio() {
    setAudioErro("");
    if (gravadorRef.current?.state === "recording") { gravadorRef.current.stop(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const gravador = new MediaRecorder(stream);
      partesAudioRef.current = [];
      gravador.ondataavailable = (evento) => { if (evento.data.size) partesAudioRef.current.push(evento.data); };
      gravador.onstop = async () => {
        setGravando(false); stream.getTracks().forEach((track) => track.stop());
        const audio = new Blob(partesAudioRef.current, { type: gravador.mimeType || "audio/webm" });
        const form = new FormData(); form.set("file", audio, "observacao.webm");
        const upload = await uploadAudio(form);
        if (!upload.ok || !upload.url) { setAudioErro(upload.erro || "Não foi possível enviar o áudio."); return; }
        const salvo = await salvarAudioServico(paradaId, servico.id, upload.url);
        if (!salvo.ok) { setAudioErro(salvo.erro || "Não foi possível vincular o áudio à OS."); return; }
        onCaptured(servico.id, { observacaoAudio: upload.url, observacaoAudioHorario: salvo.horario });
      };
      gravador.start(); gravadorRef.current = gravador; setGravando(true);
    } catch { setAudioErro("Não foi possível acessar o microfone. Verifique a permissão do navegador."); }
  }

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
    } catch (err) {
      setErro(err instanceof Error && err.message ? err.message : "Não foi possível processar a foto. Tente novamente.");
      setLoading(false);
    }
  }

  // Antes disto, sem internet a chamada só falhava (fetch rejeitando) e o
  // toque não tinha efeito nenhum — nem aviso, nem o status mudava na tela,
  // nem nada guardado pra tentar de novo depois. Fotos e "não será feito" já
  // não tinham esse problema; agora o status também cai na fila offline
  // quando a chamada falha, do mesmo jeito. O botão muda na tela na hora, em
  // qualquer um dos dois casos — igual "não será feito" já faz (ver
  // aplicarNaoFeitoLocal): o card de baixo (badge "sincronização pendente")
  // é quem avisa que ainda não é a confirmação do servidor, não a ausência
  // de reação ao toque.
  async function handleAlterarStatus(novoStatus: StatusItem) {
    if (novoStatus === servico.status) return;
    setStatusLoading(true);
    try {
      if (!navigator.onLine) {
        await onEnfileirarStatus(servico.id, novoStatus);
        onCaptured(servico.id, { status: novoStatus });
        return;
      }
      const resultado = await marcarStatusServico(paradaId, servico.id, novoStatus);
      if (resultado.ok) {
        onCaptured(servico.id, { status: novoStatus });
        return;
      }
      await onEnfileirarStatus(servico.id, novoStatus);
      onCaptured(servico.id, { status: novoStatus });
    } catch {
      await onEnfileirarStatus(servico.id, novoStatus);
      onCaptured(servico.id, { status: novoStatus });
    } finally {
      setStatusLoading(false);
    }
  }

  // Marcar com foto já tirada não faz sentido — a OS não vai acontecer — e
  // deixar ali travava só na tela, com a foto de verdade ainda no Blob e no
  // relatório. Some daqui igual some no servidor (definirNaoFeito também
  // apaga, é a mesma decisão espelhada dos dois lados): mostra localmente na
  // hora, sem esperar o round-trip.
  function aplicarNaoFeitoLocal(cat: MotivoNaoFeitoCategoria | "", just: string) {
    lastSavedRef.current = { categoria: cat, justificativa: just };
    const patch: Partial<Servico> = { naoFeitoCategoria: cat || undefined, justificativaNaoFeito: just || undefined };
    const temFoto = temAntes || temDurante || temDepois;
    if (cat && temFoto) {
      patch.fotoAntes = NO_PHOTO_PLACEHOLDER;
      patch.fotoAntesHorario = undefined;
      patch.fotoDurante = undefined;
      patch.fotoDuranteHorario = undefined;
      patch.fotoDepois = NO_PHOTO_PLACEHOLDER;
      patch.fotoDepoisHorario = undefined;
    }
    onCaptured(servico.id, patch);
  }

  // Tenta salvar direto; se estiver sem internet ou a chamada falhar (rede
  // instável, servidor fora), cai pra fila local (lib/offline-nao-feito) em
  // vez de simplesmente perder a marcação — mesma garantia que as fotos já
  // têm em campo. Em qualquer um dos dois casos o estado já fica marcado
  // como "salvo" aqui: uma vez na fila, a entrega é garantida pelo retry
  // automático (evento "online" + intervalo de 20s), então não há razão pra
  // tratar como pendente na tela.
  async function salvarNaoFeito(cat: MotivoNaoFeitoCategoria | "", just: string) {
    setSalvandoNaoFeito(true);
    try {
      if (navigator.onLine) {
        try {
          const resultado = await definirNaoFeito(paradaId, servico.id, cat, just);
          if (resultado.ok) {
            aplicarNaoFeitoLocal(cat, just);
            return;
          }
        } catch {
          // cai pro enfileiramento abaixo
        }
      }
      await onEnfileirarNaoFeito(servico.id, cat, just);
      aplicarNaoFeitoLocal(cat, just);
    } finally {
      setSalvandoNaoFeito(false);
    }
  }

  // Salva sozinho ~800ms depois de parar de digitar o detalhe — depender só
  // do onBlur (tocar fora do campo) perdia o texto sempre que o técnico saía
  // da tela antes disso: voltar pro celular, trocar de app, a lista
  // atualizando sozinha a cada 8s. Só roda com uma categoria já escolhida —
  // detalhe sem categoria não tem o que marcar (ver comentário no tipo
  // Servico: a categoria É o sinal de "está marcado"). "categoria" também
  // entra nas dependências: sem isso, trocar de categoria rápido enquanto um
  // save de texto ainda está no timer reagendava com o closure antigo e
  // podia reescrever por cima da categoria nova com a antiga.
  useEffect(() => {
    if (!categoria) return;
    if (justificativa.trim() === lastSavedRef.current.justificativa && categoria === lastSavedRef.current.categoria) return;
    const timer = setTimeout(() => {
      void salvarNaoFeito(categoria, justificativa.trim());
    }, 800);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [justificativa, categoria]);

  function handleDesmarcarNaoFeito() {
    setNaoFeitoAberto(false);
    setCategoria("");
    setJustificativa("");
    if (lastSavedRef.current.categoria) void salvarNaoFeito("", "");
  }

  // Escolher a categoria já salva na hora — é ela que marca o serviço, não
  // precisa esperar o técnico digitar um detalhe pra a marcação valer.
  function handleEscolherCategoria(opcao: MotivoNaoFeitoCategoria) {
    setCategoria(opcao);
    // Some com qualquer mensagem de captura de foto anterior — ela deixa de
    // fazer sentido assim que a área de foto trava.
    setUltimoResultado("");
    setErro("");
    void salvarNaoFeito(opcao, justificativa.trim());
  }

  // Só abre/fecha o painel quando ainda não há categoria escolhida — uma vez
  // marcado, tocar no quadradinho é sempre "desmarcar" (some com categoria e
  // detalhe), não só fechar a visão.
  function handleToqueNaoFeito() {
    if (categoria) {
      handleDesmarcarNaoFeito();
      return;
    }
    setNaoFeitoAberto((v) => !v);
  }

  // Borda esquerda colorida pelo status — a mesma linguagem da faixa de
  // estatísticas do Dashboard (border-l-4 + cor semântica), aplicada aqui
  // como uma pista extra de status que dá pra notar rolando a lista, sem
  // precisar ler os botões — nunca a ÚNICA pista, os botões de status e o
  // rótulo continuam sendo a fonte de verdade.
  const corBordaStatus =
    servico.status === "concluido" ? "border-l-success-500" : servico.status === "em_andamento" ? "border-l-brand-500" : "border-l-slate-300";

  return (
    <div className={cn("rounded-2xl border border-slate-200 border-l-4 bg-white p-4 shadow-sm", corBordaStatus)}>
      {/* Sem "capture" de propósito: assim o celular mostra a opção de tirar
          foto NA HORA ou escolher uma já tirada antes (útil quando a foto foi
          tirada num momento sem internet e só agora dá pra anexar). */}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="label-tecnico inline-flex items-center rounded-sm bg-brand-50 px-1.5 py-0.5 text-[10px] font-bold text-brand-700">
            OS {servico.numeroOS}
          </span>
          <span className="truncate text-[11px] font-semibold text-slate-400">{servico.area}</span>
        </div>
        {/* O que precisa ser feito é a informação que realmente diferencia uma
            OS da outra em campo — o equipamento sozinho costuma ser um código
            técnico genérico que não diz nada de cara. */}
        <h3 className="mt-1.5 text-base font-bold leading-snug text-slate-900">{servico.problemaIdentificado}</h3>
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

      {/* Alerta de histórico: essa mesma OS (ou equipamento) já ficou marcada
          "não será feito" numa parada anterior. Aparece antes dos botões de
          status de propósito — é o que muda a decisão de priorizar ou não
          esse serviço, então precisa ser visto antes de qualquer toque. */}
      {historicoNaoFeito && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-warning-200 bg-warning-50 px-3 py-2.5">
          <AlertTriangle size={15} className="mt-0.5 flex-none text-warning-600" />
          <div className="min-w-0">
            <p className="text-xs font-bold text-warning-800">
              Não foi feito na parada &quot;{historicoNaoFeito.paradaNome}&quot; ({formatDateCompact(historicoNaoFeito.paradaData)}) — {historicoNaoFeito.categoria}
            </p>
            {historicoNaoFeito.justificativa && <p className="mt-0.5 text-xs text-warning-700">{historicoNaoFeito.justificativa}</p>}
          </div>
        </div>
      )}

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
              // min-h-11 = 44px, a altura de toque recomendada. Os tres
              // dividem a linha com flex-1, entao crescer em altura nao tira
              // espaco de ninguem — era so o padding que os deixava em 28px,
              // que e pouco pra um dedo com luva marcando status em campo.
              "flex min-h-11 flex-1 items-center justify-center gap-1 rounded-lg px-2 text-[10px] font-bold uppercase transition-colors disabled:opacity-60",
              servico.status === opcao.value ? opcao.ativoClasse : "bg-slate-50 text-slate-400 hover:bg-slate-100"
            )}
          >
            {servico.status === opcao.value && <Check size={11} />}
            {opcao.label}
          </button>
        ))}
      </div>
      {pendenteStatus && (
        <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-bold text-warning-700">
          <WifiOff size={11} className="flex-none" />
          Salvo neste aparelho — sincroniza quando a conexão voltar
        </p>
      )}

      {/* Quadradinho separado dos 3 status: "não será feito" não é um estado
          transitório do serviço (como Pendente/Em Andamento), é uma decisão
          definitiva que precisa de categoria — por isso abre um painel de
          escolha em vez de só marcar um status. Só o editor (quem está nessa
          tela) vê e escreve isso; aparece pro admin no checklist de
          pendências da tela principal, não na apresentação. */}
      <button
        type="button"
        onClick={handleToqueNaoFeito}
        className="-ml-1 mt-2 flex min-h-11 items-center gap-1.5 rounded-lg px-1 text-xs font-bold text-slate-500 active:bg-slate-100 hover:text-danger-600"
      >
        {categoria ? <CheckSquare size={15} className="text-danger-600" /> : <Square size={15} />}
        Não será feito
      </button>
      {naoFeitoAberto && (
        <div className="mt-1.5 space-y-2">
          {/* Categorias fechadas em vez de texto livre: é o que deixa dar
              pra agrupar "isso se repete" no alerta de histórico e no resumo
              do dashboard — texto livre, cada técnico escreve diferente pra
              dizer a mesma coisa, e nada bate igual. Escolher já salva na
              hora, sem esperar nenhum texto. */}
          <div className="flex flex-wrap gap-1.5">
            {MOTIVOS_NAO_FEITO.map((opcao) => (
              <button
                key={opcao}
                type="button"
                onClick={() => handleEscolherCategoria(opcao)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-[11px] font-bold transition-colors",
                  categoria === opcao ? "border-danger-400 bg-danger-100 text-danger-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                )}
              >
                {opcao}
              </button>
            ))}
          </div>
          <textarea
            value={justificativa}
            onChange={(e) => setJustificativa(e.target.value)}
            onBlur={() => {
              if (categoria && (justificativa.trim() !== lastSavedRef.current.justificativa || categoria !== lastSavedRef.current.categoria)) {
                void salvarNaoFeito(categoria, justificativa.trim());
              }
            }}
            placeholder="Detalhe (opcional) — ex: qual peça, previsão de chegada"
            rows={2}
            className="w-full rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-xs text-slate-700 outline-none placeholder:text-danger-400 focus:border-danger-400"
          />
          {salvandoNaoFeito && <p className="text-[10px] font-bold text-slate-400">Salvando...</p>}
          {pendenteNaoFeito && !salvandoNaoFeito && (
            <p className="flex items-center gap-1.5 text-[10px] font-bold text-warning-700">
              <WifiOff size={11} className="flex-none" />
              Sem internet — guardado no aparelho, envia sozinho quando a conexão voltar
            </p>
          )}
        </div>
      )}

      {/* Marcado como "não será feito": a OS não vai acontecer, então não
          faz sentido continuar oferecendo tirar foto — trava a área inteira
          em vez de só deixar do jeito que estava (o que deixaria tirar foto
          de um serviço que a própria tela diz que não vai ser feito). Some
          até desmarcar a caixinha lá em cima. */}
      {categoria ? (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-xs font-bold text-slate-400">
          <Lock size={14} className="flex-none" />
          Fotos bloqueadas — desmarque &quot;Não será feito&quot; pra tirar foto
        </div>
      ) : (
        <>
          {/* "Zona de captura" isolada num painel próprio — antes os pontos de
              etapa e o botão de foto viviam soltos no mesmo espaço dos botões
              de status, sem nada separando visualmente "decidir o status" de
              "registrar a foto", que são as duas ações principais do card. */}
          <div className="mt-3 rounded-xl bg-slate-50 p-3">
            {/* O rotulo antigo era "Toque para escolher a etapa da foto" — uma
                instrucao, quando o que falta e uma resposta. A etapa ja vem escolhida
                sozinha (etapaSugerida), entao a pergunta de quem olha nao e "o que eu
                faco aqui", e sim "onde e que essa foto vai parar". O texto agora diz
                isso, e diz por extenso qual etapa esta valendo. */}
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
              A próxima foto entra em <span className="text-brand-700">{etapaAtiva}</span>
              {jaTemFotoNaEtapaAtiva && <span className="text-warning-700"> · vai substituir a atual</span>}
            </p>
            <div className="mt-1.5 flex gap-2">
              <EtapaDot preenchida={temAntes} selecionada={etapaAtiva === "Antes"} horario={servico.fotoAntesHorario} label="Antes" onClick={() => setEtapaEscolhida("Antes")} />
              <EtapaDot preenchida={temDurante} selecionada={etapaAtiva === "Durante"} horario={servico.fotoDuranteHorario} label="Durante" opcional onClick={() => setEtapaEscolhida("Durante")} />
              <EtapaDot preenchida={temDepois} selecionada={etapaAtiva === "Depois"} horario={servico.fotoDepoisHorario} label="Depois" onClick={() => setEtapaEscolhida("Depois")} />
            </div>

            {/* Ação principal do card: maior sombra e feedback de toque
                (active:scale) pra se destacar como O botão que importa aqui —
                tudo o mais na "zona de captura" leva até ele. */}
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={loading}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3.5 text-sm font-bold text-white shadow-[0_4px_12px_rgba(27,77,153,0.25)] transition-[background-color,transform] hover:bg-brand-700 active:scale-[0.98] disabled:opacity-60"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
              {loading ? "Enviando..." : jaTemFotoNaEtapaAtiva ? `Substituir foto de ${etapaAtiva}` : `Tirar foto de ${etapaAtiva}`}
            </button>
            <button type="button" onClick={alternarAudio} disabled={loading} className={cn("mt-2 flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold transition-colors disabled:opacity-60", gravando ? "border-red-300 bg-red-50 text-red-700" : "border-brand-200 bg-white text-brand-700 hover:bg-brand-50")}>
              {gravando ? <Square size={15} fill="currentColor" /> : <Mic size={17} />}
              {gravando ? "Parar e salvar observação" : servico.observacaoAudio ? "Gravar nova observação de áudio" : "Gravar observação de áudio"}
            </button>
            {gravando && <p className="mt-1.5 text-center text-[11px] font-bold text-red-600">Gravando — fale o defeito, material ou bloqueio encontrado.</p>}
            {servico.observacaoAudio && !gravando && <audio controls src={servico.observacaoAudio} className="mt-2 h-8 w-full" />}
            {audioErro && <p className="mt-2 text-center text-xs font-semibold text-danger-600">{audioErro}</p>}

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
        </>
      )}
    </div>
  );
}

// A foto Depois é a evidência obrigatória de encerramento. Foto Antes e
// Durante enriquecem o registro, mas não podem manter uma OS aberta.
function faltaFoto(servico: Servico): boolean {
  const temDepois = !!servico.fotoDepois && servico.fotoDepois !== NO_PHOTO_PLACEHOLDER;
  return !temDepois;
}

// A planilha pode trazer equipe externa como "Terceiros - Carlos Henrique /
// Henrique". "Terceiros" é grupo, não pessoa: os chips e filtros precisam
// trabalhar com cada nome completo, sem confundir Carlos Henrique com Henrique.
function separarResponsaveis(responsavel: string): string[] {
  return responsavel
    .replace(/^\s*terceiros?\s*[-:–—]?\s*/i, "")
    .split(/\s*(?:\+|\/|,|;|\be\b)\s*/i)
    .map((nome) => nome.trim())
    .filter((nome) => nome && !/^terceiros?$/i.test(nome) && pareceNomeDePessoa(nome));
}

// Uma disputa de versão acontece quando dois celulares (ou o refresh do
// relatório) gravam quase juntos. Não é recusa definitiva: a fila deve
// manter a evidência e tentar outra vez, com a versão nova do relatório.
function falhaDaFila(erro: string): ResultadoTentativa {
  if (/muitas alterações simultâneas/i.test(erro)) return { ok: false, tipo: "rede" };
  return { ok: false, tipo: "negocio", erro };
}

// Mapa de campo: fica na mesma tela em que o técnico registra as fotos, para
// que o prazo não fique escondido apenas na apresentação. Ele usa os horários
// já programados na OS; não inventa duração real a partir da foto.
function GanttDeCampo({ data, agora }: { data: ParadaCompleta; agora: Date | null }) {
  const atividades = servicosProgramados(data.servicos).sort((a, b) => a.inicioMinutos - b.inicioMinutos);
  if (atividades.length === 0) return null;

  const inicio = Math.min(...atividades.map((item) => item.inicioMinutos));
  const fimManutencao = Math.max(...atividades.map((item) => item.fimMinutos));
  const limiteHoras = parseHoras(data.resumo.duracaoPlanejada) || Math.max((fimManutencao - inicio) / 60, 0.5);
  const fimLimite = inicio + limiteHoras * 60;
  const fimEscala = Math.max(fimManutencao, fimLimite);
  const duracaoEscala = Math.max(fimEscala - inicio, 30);
  const manutencaoHoras = Math.round(((fimManutencao - inicio) / 60) * 10) / 10;
  const folga = Math.round((limiteHoras - manutencaoHoras) * 10) / 10;
  const atrasadas = atividades.filter((item) => item.status === "atrasado").length;
  const emRisco = atrasadas > 0 || folga < 0;
  const folgaCurta = !emRisco && folga <= 1;
  const cor = emRisco ? "border-danger-200 bg-danger-50 text-danger-800" : folgaCurta ? "border-warning-200 bg-warning-50 text-warning-800" : "border-success-200 bg-success-50 text-success-800";
  const agoraMinutos = agora ? agora.getHours() * 60 + agora.getMinutes() : null;
  // Uma parada pode passar da meia-noite. Nesse caso 00:30 é o "dia seguinte"
  // no mapa, não uma hora antes de 22:00.
  const agoraNoMapa = agoraMinutos !== null && fimEscala > 1440 && agoraMinutos < inicio ? agoraMinutos + 1440 : agoraMinutos;
  const mostrarAgora = agoraNoMapa !== null && agoraNoMapa >= inicio && agoraNoMapa <= fimEscala;
  const posicaoAgora = mostrarAgora ? ((agoraNoMapa - inicio) / duracaoEscala) * 100 : 0;
  const hoje = agora ? `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}-${String(agora.getDate()).padStart(2, "0")}` : "";
  const acompanharAoVivo = data.resumo.data === hoje && agoraNoMapa !== null && agoraNoMapa >= inicio;
  const naoIniciadasNoHorario = acompanharAoVivo ? atividades.filter((item) => item.status === "pendente" && item.inicioMinutos <= (agoraNoMapa ?? 0)) : [];
  const vencidas = acompanharAoVivo ? atividades.filter((item) => item.status !== "concluido" && !item.naoFeitoCategoria && item.fimMinutos < (agoraNoMapa ?? 0)) : [];
  const pesoTotal = atividades.reduce((soma, item) => soma + (item.fimMinutos - item.inicioMinutos), 0);
  const pesoConcluido = atividades.filter((item) => item.status === "concluido").reduce((soma, item) => soma + (item.fimMinutos - item.inicioMinutos), 0);
  const percentualExecutado = pesoTotal > 0 ? pesoConcluido / pesoTotal : 0;
  const minutosTranscorridos = acompanharAoVivo ? Math.max(0, (agoraNoMapa ?? inicio) - inicio) : 0;
  // Projeção por ritmo: se em 2h foram concluídos 25% das horas programadas,
  // a projeção é 8h desde o início. Só aparece depois de haver entrega real.
  const previsaoFim = acompanharAoVivo && percentualExecutado > 0 && minutosTranscorridos > 0 ? Math.round(inicio + minutosTranscorridos / percentualExecutado) : null;
  const previsaoAtrasada = previsaoFim !== null && previsaoFim > fimLimite;
  const totalAtividades = data.servicos.length;
  const totalConcluidas = data.servicos.filter((item) => item.status === "concluido").length;
  const concluidaCompleta = totalAtividades > 0 && totalConcluidas === totalAtividades;
  // "Encerrada" pode vir da finalização formal do relatório ou do término da
  // janela de hoje. A marca verde, porém, é reservada exclusivamente para
  // 100% concluído — encerrada com pendências não pode parecer sucesso total.
  const janelaTerminou = data.resumo.data < hoje || (data.resumo.data === hoje && agoraNoMapa !== null && agoraNoMapa >= fimLimite);
  const paradaEncerrada = concluidaCompleta || data.resumo.status !== "em_andamento" || janelaTerminou;
  const equipes = Array.from(new Set(data.servicos.map((servico) => servico.equipe))).map((equipe) => {
    const itens = data.servicos.filter((servico) => servico.equipe === equipe);
    return { equipe, pendentes: itens.filter((s) => s.status === "pendente").length, andamento: itens.filter((s) => s.status === "em_andamento").length, concluidas: itens.filter((s) => s.status === "concluido").length };
  });

  return (
    <section className={`overflow-hidden rounded-2xl border ${cor}`} aria-label="Mapa Gantt e tendência da parada">
      <div className="flex items-start justify-between gap-3 px-4 py-3">
        <div>
          <p className="flex items-center gap-1.5 text-sm font-extrabold"><CalendarRange size={16} /> Mapa da parada</p>
          <p className="mt-0.5 text-[11px] font-semibold opacity-80">Manutenção {manutencaoHoras}h · limite {limiteHoras}h · {folga >= 0 ? `${folga}h de folga` : `${Math.abs(folga)}h acima do limite`}</p>
        </div>
        {concluidaCompleta ? <span className="flex flex-none items-center gap-1 rounded-full bg-success-100 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-success-800"><CheckCircle2 size={13} /> Concluída</span> : paradaEncerrada ? <span className="flex-none rounded-full bg-slate-200 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-slate-700">Encerrada</span> : <span className="flex-none rounded-full bg-white/70 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide">{emRisco ? "Risco" : folgaCurta ? "Folga curta" : "No prazo"}</span>}
      </div>
      <div className="border-t border-current/15 bg-white p-3">
        <div className="mb-2 grid grid-cols-3 text-[10px] font-bold text-slate-500"><span>Início {formatarHorario(inicio)}</span><span className="text-center">Fim manutenção {formatarHorario(fimManutencao)}</span><span className="text-right">Entrega {formatarHorario(fimLimite)}</span></div>
        {mostrarAgora && <p className="mb-2 flex items-center gap-1 text-[10px] font-extrabold text-slate-700"><i className="h-2 w-0.5 bg-slate-900" /> Agora: {formatarHorario(agoraNoMapa ?? 0)}</p>}
        {acompanharAoVivo && (
          <div className="mb-3 space-y-1.5">
            {concluidaCompleta ? (
              <div className="flex items-center gap-2 rounded-lg bg-success-50 px-2.5 py-2 text-[11px] font-extrabold text-success-800"><CheckCircle2 size={16} /> Parada concluída — {totalConcluidas}/{totalAtividades} atividades finalizadas.</div>
            ) : paradaEncerrada ? (
              <div className="rounded-lg bg-slate-100 px-2.5 py-2 text-[11px] font-bold text-slate-700">Parada encerrada com pendências — {totalConcluidas}/{totalAtividades} atividades concluídas.</div>
            ) : previsaoFim !== null ? (
              <div className={`rounded-lg px-2.5 py-2 text-[11px] font-bold ${previsaoAtrasada ? "bg-danger-50 text-danger-800" : "bg-success-50 text-success-800"}`}>
                Previsão pelo ritmo atual: término às {formatarHorario(previsaoFim)} {previsaoAtrasada ? `· ${Math.round((previsaoFim - fimLimite) / 60 * 10) / 10}h após o limite` : `· ${Math.round((fimLimite - previsaoFim) / 60 * 10) / 10}h de margem`}
              </div>
            ) : (
              <div className="rounded-lg bg-slate-50 px-2.5 py-2 text-[11px] font-bold text-slate-600">Previsão de término será calculada quando a primeira OS for concluída.</div>
            )}
            {!paradaEncerrada && naoIniciadasNoHorario.length > 0 && <div className="rounded-lg bg-warning-50 px-2.5 py-2 text-[11px] font-bold text-warning-800">{naoIniciadasNoHorario.length} atividade{naoIniciadasNoHorario.length > 1 ? "s" : ""} já deveria{naoIniciadasNoHorario.length > 1 ? "m" : ""} ter iniciado: {naoIniciadasNoHorario.slice(0, 3).map((item) => `OS ${item.numeroOS}`).join(", ")}{naoIniciadasNoHorario.length > 3 ? "…" : ""}</div>}
            {!paradaEncerrada && vencidas.length > 0 && <div className="rounded-lg bg-danger-50 px-2.5 py-2 text-[11px] font-bold text-danger-800">{vencidas.length} atividade{vencidas.length > 1 ? "s" : ""} passou{vencidas.length > 1 ? "ram" : ""} do horário final e continua{vencidas.length > 1 ? "m" : ""} aberta{vencidas.length > 1 ? "s" : ""}: {vencidas.slice(0, 3).map((item) => `OS ${item.numeroOS}`).join(", ")}{vencidas.length > 3 ? "…" : ""}</div>}
          </div>
        )}
        <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 p-2.5">
          <p className="mb-2 text-[10px] font-extrabold uppercase tracking-wide text-slate-500">Mapa de equipes</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {equipes.map((item) => <div key={item.equipe} className="rounded-lg bg-white px-2.5 py-2 text-[10px] shadow-sm"><p className="truncate font-extrabold text-slate-700">{item.equipe}</p><p className="mt-0.5 font-bold text-slate-500"><span className="text-emerald-700">{item.concluidas} concluída{item.concluidas !== 1 ? "s" : ""}</span> · <span className="text-brand-700">{item.andamento} em andamento</span> · {item.pendentes} pendente{item.pendentes !== 1 ? "s" : ""}</p></div>)}
          </div>
        </div>
        <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
          {atividades.map((atividade) => {
            const left = ((atividade.inicioMinutos - inicio) / duracaoEscala) * 100;
            const width = Math.max(((atividade.fimMinutos - atividade.inicioMinutos) / duracaoEscala) * 100, 2.5);
            const classe = atividade.status === "concluido" ? "bg-success-600" : atividade.status === "atrasado" ? "bg-danger-600" : atividade.status === "em_andamento" ? "bg-brand-600" : "bg-slate-400";
            return (
              <div key={atividade.id} className="grid grid-cols-[112px_1fr] items-center gap-2">
                <div className="min-w-0" title={`${atividade.numeroOS} · ${atividade.equipamento}`}><p className="truncate text-[10px] font-bold text-slate-600">OS {atividade.numeroOS}</p><p className="text-[9px] font-semibold text-slate-400">{atividade.horaInicio} → {atividade.horaFim}</p></div>
                <div className="relative h-5 overflow-visible rounded bg-slate-100">
                  <div className={`absolute top-0 h-5 rounded ${classe}`} style={{ left: `${left}%`, width: `${width}%` }} title={`${atividade.horaInicio} — ${atividade.horaFim}`} />
                  {mostrarAgora && <i className="absolute -top-1 z-[1] h-7 w-0.5 bg-slate-900" style={{ left: `${posicaoAgora}%` }} aria-label="Horário atual" />}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-bold text-slate-500"><span><i className="mr-1 inline-block h-2 w-2 rounded bg-success-600" />Concluída</span><span><i className="mr-1 inline-block h-2 w-2 rounded bg-brand-600" />Em andamento</span><span><i className="mr-1 inline-block h-2 w-2 rounded bg-slate-400" />Pendente</span>{atrasadas > 0 && <span className="text-danger-700"><i className="mr-1 inline-block h-2 w-2 rounded bg-danger-600" />{atrasadas} atrasada{atrasadas > 1 ? "s" : ""}</span>}</div>
      </div>
    </section>
  );
}

function CapturaRapidaConteudo({ id, onSessaoExpirada }: { id: string; onSessaoExpirada: () => void }) {
  const [data, setData] = useState<ParadaCompleta | null>(null);
  const [status, setStatus] = useState<"loading" | "found" | "not-found">("loading");
  const [atualizando, setAtualizando] = useState(false);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date | null>(null);
  const [horaAgora, setHoraAgora] = useState<Date | null>(null);
  const [busca, setBusca] = useState("");
  // Chip de pessoa é filtro exato pelo primeiro nome; não reutiliza a busca
  // textual, porque "Henrique" também casa dentro de "Carlos Henrique".
  const [pessoaFiltro, setPessoaFiltro] = useState("");
  // OS concluída fica fora da lista por padrão — com muitas OS na parada,
  // a lista inteira de "já feito" só atrapalha achar o que ainda falta.
  const [mostrarConcluidas, setMostrarConcluidas] = useState(false);
  // Fotos tiradas sem internet ficam guardadas no aparelho (IndexedDB) até
  // a conexão voltar — isso é o que sobrevive a fechar o app/trocar de tela,
  // diferente de só guardar em memória do componente.
  const [filaPendente, setFilaPendente] = useState<FotoPendente[]>([]);
  const [enviandoFila, setEnviandoFila] = useState(false);
  // Mesma ideia da fila de fotos, mas pro "não será feito" — uma pendência
  // por serviço (a mais nova substitui), guardada no IndexedDB até a conexão
  // voltar. Ver lib/offline-nao-feito.ts.
  const [filaNaoFeitoPendente, setFilaNaoFeitoPendente] = useState<NaoFeitoPendente[]>([]);
  const [enviandoNaoFeito, setEnviandoNaoFeito] = useState(false);
  // Terceira fila, mesmo desenho: mudança de status pendente de salvar. Ver
  // lib/offline-status.ts — cobre a lacuna que só fotos e "não será feito"
  // tinham fechado antes (marcar status sem internet simplesmente falhava
  // sem guardar nada).
  const [filaStatusPendente, setFilaStatusPendente] = useState<StatusPendente[]>([]);
  const [enviandoStatus, setEnviandoStatus] = useState(false);
  // Bloco F: guarda SÍNCRONA (ref, não state) de "já tem uma sincronização
  // desta fila em andamento". O `enviando*` acima é só pra tela (mostrar o
  // spinner) — como setState é assíncrono, duas chamadas de tentarEnviarFila*
  // disparadas quase juntas (o evento "online" e o intervalo de 20s, por
  // exemplo) podiam ler `enviandoFila` como false as DUAS antes de qualquer
  // re-render acontecer, e as duas processavam a mesma fila ao mesmo tempo —
  // upload em dobro da mesma foto, dobro de chamada de servidor pro mesmo
  // item. Ref é lida/escrita na hora, sem esperar o React re-renderizar, o
  // que fecha essa janela de verdade (é o mesmo motivo de temDadosRef acima).
  const enviandoFilaRef = useRef(false);
  const enviandoNaoFeitoRef = useRef(false);
  const enviandoStatusRef = useRef(false);
  // navigator.onLine sozinho não conta a história toda (uma rede com portal
  // cativo, ou wifi sem internet de verdade, ainda reporta "online") — mas é
  // o mesmo sinal que o resto do app já usa (useConectividade, Bloco C), e
  // trocar por algo mais sofisticado aqui seria uma segunda lógica de
  // conectividade rodando ao lado da que já existe.
  const online = useConectividade();
  // Histórico de "não será feito" de todos os relatórios — carregado uma vez
  // (não muda a cada 8s como o resto da tela) e cruzado localmente contra
  // cada serviço pra decidir se mostra o alerta.
  const [historico, setHistorico] = useState<HistoricoNaoFeitoItem[]>([]);
  // Timestamp de quando os dados na tela vieram do cache local (aparelho
  // sem sinal), não do servidor — null quando o que está na tela é a
  // versão real, recém-confirmada.
  const [usandoCache, setUsandoCache] = useState<number | null>(null);
  // Ref (não state) porque só serve pra decidir, dentro de carregar(), se uma
  // falha de rede é a carga inicial (tenta o cache) ou só um refresh em
  // segundo plano que não deu certo (ignora, mantém o que já está na tela).
  // Precisa ser ref: carregar() roda dentro de um setInterval configurado
  // uma vez no mount, então uma variável de state lida ali ficaria presa no
  // valor da primeira renderização.
  const temDadosRef = useRef(false);

  function registrarFalhaDaFila(erro: string): ResultadoTentativa {
    // Não deixa uma fila pendente virar um "erro de servidor" sem saída
    // quando o único problema é a sessão expirada. Os blobs continuam no
    // IndexedDB e, após digitar a senha, serão enviados normalmente.
    if (/^não autorizado\.?$/i.test(erro.trim())) onSessaoExpirada();
    return falhaDaFila(erro);
  }

  // Sem nenhum setState síncrono no início — assim dá pra chamar direto no
  // corpo de um efeito (carga inicial, atualização em segundo plano) sem
  // disparar um render extra fora do fluxo normal do React. Quem precisa
  // mostrar spinner (o botão de atualizar manual) usa atualizarComSpinner.
  async function carregar() {
    try {
      const res = await getParadaCompleta(id);
      if (res) {
        temDadosRef.current = true;
        setData(res);
        setStatus("found");
        setUltimaAtualizacao(new Date());
        setUsandoCache(null);
        void salvarParadaCache(id, res);
        return;
      }
      if (!temDadosRef.current) setStatus("not-found");
    } catch {
      // Falha de rede (provavelmente sem sinal). Se a tela já tem algo
      // carregado, é só um refresh em segundo plano que não deu certo — não
      // mexe em nada, o que já está na tela continua valendo. Se é a carga
      // inicial, tenta a última versão salva no aparelho em vez de travar
      // em "carregando" pra sempre.
      if (temDadosRef.current) return;
      const cache = await carregarParadaCache(id);
      if (cache) {
        temDadosRef.current = true;
        setData(cache.parada);
        setStatus("found");
        setUsandoCache(cache.salvoEm);
      } else {
        setStatus("not-found");
      }
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

  // As três filas (fotos, "não será feito", status) processam do mesmo jeito
  // — só muda COMO uma tentativa de item é feita. tentar() abaixo devolve:
  // - exceção (fetch rejeitou) => "rede": sem conexão de verdade, o motor
  //   (lib/offline-sync.ts) continua tentando sozinho, sem incomodar ninguém.
  // - {ok:false} do servidor => "negocio": a chamada CHEGOU e foi recusada
  //   (sessão expirada, serviço não existe mais, ou o teto de tentativas da
  //   proteção de concorrência do Bloco A esgotado) — isso é informação real
  //   que o técnico precisa ver, não repete sozinho a cada 20s pra sempre.

  // Tenta enviar tudo que ficou guardado no aparelho por falta de conexão.
  // Cada foto é tentada de forma independente — uma falhar não impede as
  // outras de irem, e o que não for enviado continua na fila pra próxima vez.
  async function tentarEnviarFila(opcoes: { incluirComErro?: boolean } = {}) {
    if (enviandoFilaRef.current) return;
    enviandoFilaRef.current = true;
    setEnviandoFila(true);
    try {
      const itens = await listarFotosPendentes(id);
      if (itens.length === 0) {
        setFilaPendente([]);
        return;
      }
      const { sincronizados, atualizados } = await processarFila<FotoPendente>(
        itens,
        async (item): Promise<ResultadoTentativa> => {
          try {
            const formData = new FormData();
            formData.set("file", item.blob, item.nomeArquivo);
            const upload = await uploadFoto(formData);
            if (!upload.ok || !upload.url) return registrarFalhaDaFila(upload.erro || "Não foi possível enviar a foto.");
            const resultado = await capturarFotoServico(id, item.servicoId, upload.url, item.etapa);
            if (!resultado.ok) return registrarFalhaDaFila(resultado.erro || "Não foi possível registrar a foto.");
            const campo = resultado.label === "Antes" ? "fotoAntes" : resultado.label === "Durante" ? "fotoDurante" : "fotoDepois";
            const horarioCampo = resultado.label === "Antes" ? "fotoAntesHorario" : resultado.label === "Durante" ? "fotoDuranteHorario" : "fotoDepoisHorario";
            handleCaptured(item.servicoId, {
              [campo]: upload.url,
              [horarioCampo]: resultado.horario,
              ...(resultado.statusFechado ? { status: resultado.statusFechado } : {}),
            } as Partial<Servico>);
            return { ok: true };
          } catch {
            return { ok: false, tipo: "rede" };
          }
        },
        opcoes
      );
      await Promise.all(sincronizados.map((itemId) => removerFotoPendente(itemId)));
      await Promise.all(atualizados.map((item) => salvarFotoPendente(item)));
      setFilaPendente(atualizados);
    } finally {
      enviandoFilaRef.current = false;
      setEnviandoFila(false);
    }
  }

  // Chamado pelo card de cada OS quando não dá pra enviar a foto na hora
  // (sem internet, ou o envio falhou) — guarda no aparelho e some da tela;
  // essa mesma fila é reprocessada sozinha quando a conexão voltar. Chave
  // determinística (não um id aleatório): retirar a mesma foto de novo
  // enquanto ainda offline SUBSTITUI a pendência anterior em vez de
  // empilhar uma segunda (ver chaveFotoPendente).
  async function enfileirarFoto(servicoId: string, etapa: "Antes" | "Durante" | "Depois", blob: Blob, nomeArquivo: string) {
    const item: FotoPendente = {
      id: chaveFotoPendente(id, servicoId, etapa),
      paradaId: id,
      servicoId,
      etapa,
      nomeArquivo,
      blob,
      criadoEm: Date.now(),
      sincronizacao: "pendente",
      tentativas: 0,
    };
    await salvarFotoPendente(item);
    setFilaPendente((prev) => [...prev.filter((p) => p.id !== item.id), item]);
    // Offline é uma confirmação local: a foto está guardada de forma
    // persistente no IndexedDB. Ao fotografar o Depois, já fecha a OS na tela
    // e no cache; quando houver rede a fila substitui pelo URL definitivo.
    if (etapa === "Depois") handleCaptured(servicoId, { status: "concluido" });
    if (navigator.onLine) tentarEnviarFila();
  }

  // Mesma lógica de tentarEnviarFila, mas pra "não será feito" — cada item
  // já é o estado final desejado daquele serviço, então basta reaplicar.
  async function tentarEnviarFilaNaoFeito(opcoes: { incluirComErro?: boolean } = {}) {
    if (enviandoNaoFeitoRef.current) return;
    enviandoNaoFeitoRef.current = true;
    setEnviandoNaoFeito(true);
    try {
      const itens = await listarNaoFeitoPendente(id);
      if (itens.length === 0) {
        setFilaNaoFeitoPendente([]);
        return;
      }
      const { sincronizados, atualizados } = await processarFila<NaoFeitoPendente>(
        itens,
        async (item): Promise<ResultadoTentativa> => {
          try {
            const resultado = await definirNaoFeito(id, item.servicoId, item.categoria, item.justificativa);
            if (!resultado.ok) return registrarFalhaDaFila(resultado.erro || "Não foi possível salvar.");
            handleCaptured(item.servicoId, {
              naoFeitoCategoria: (item.categoria || undefined) as MotivoNaoFeitoCategoria | undefined,
              justificativaNaoFeito: item.justificativa || undefined,
            });
            return { ok: true };
          } catch {
            return { ok: false, tipo: "rede" };
          }
        },
        opcoes
      );
      await Promise.all(sincronizados.map((itemId) => removerNaoFeitoPendente(itemId)));
      await Promise.all(atualizados.map((item) => atualizarItemNaoFeito(item)));
      setFilaNaoFeitoPendente(atualizados);
    } finally {
      enviandoNaoFeitoRef.current = false;
      setEnviandoNaoFeito(false);
    }
  }

  // Chamado pelo card quando marcar/desmarcar "não será feito" falha (sem
  // internet ou erro de rede) — guarda no aparelho a pendência mais recente
  // desse serviço (substitui qualquer uma anterior ainda não enviada).
  async function enfileirarNaoFeito(servicoId: string, categoria: MotivoNaoFeitoCategoria | "", justificativa: string) {
    await salvarNaoFeitoPendente(id, servicoId, categoria, justificativa);
    setFilaNaoFeitoPendente((prev) => [
      ...prev.filter((p) => p.servicoId !== servicoId),
      { id: `${id}:${servicoId}`, paradaId: id, servicoId, categoria, justificativa, criadoEm: Date.now(), sincronizacao: "pendente", tentativas: 0 },
    ]);
    if (navigator.onLine) tentarEnviarFilaNaoFeito();
  }

  // Terceira fila: mudança de status. Mesmo desenho das duas acima.
  async function tentarEnviarFilaStatus(opcoes: { incluirComErro?: boolean } = {}) {
    if (enviandoStatusRef.current) return;
    enviandoStatusRef.current = true;
    setEnviandoStatus(true);
    try {
      const itens = await listarStatusPendente(id);
      if (itens.length === 0) {
        setFilaStatusPendente([]);
        return;
      }
      const { sincronizados, atualizados } = await processarFila<StatusPendente>(
        itens,
        async (item): Promise<ResultadoTentativa> => {
          try {
            const resultado = await marcarStatusServico(id, item.servicoId, item.novoStatus);
            if (!resultado.ok) return registrarFalhaDaFila(resultado.erro || "Não foi possível salvar o status.");
            return { ok: true };
          } catch {
            return { ok: false, tipo: "rede" };
          }
        },
        opcoes
      );
      await Promise.all(sincronizados.map((itemId) => removerStatusPendente(itemId)));
      await Promise.all(atualizados.map((item) => atualizarItemStatus(item)));
      setFilaStatusPendente(atualizados);
    } finally {
      enviandoStatusRef.current = false;
      setEnviandoStatus(false);
    }
  }

  // Chamado pelo card quando marcar status falha (sem internet ou erro) —
  // guarda a intenção mais recente pra esse serviço (substitui qualquer
  // pendência anterior ainda não enviada, já que só o valor final importa).
  async function enfileirarStatus(servicoId: string, novoStatus: StatusItem) {
    await salvarStatusPendente(id, servicoId, novoStatus);
    setFilaStatusPendente((prev) => [
      ...prev.filter((p) => p.servicoId !== servicoId),
      { id: `${id}:${servicoId}`, paradaId: id, servicoId, novoStatus, criadoEm: Date.now(), sincronizacao: "pendente", tentativas: 0 },
    ]);
    if (navigator.onLine) tentarEnviarFilaStatus();
  }

  // "Tentar novamente": pedido explícito do usuário, cobrindo inclusive os
  // itens marcados "erro" que o ciclo automático (abaixo) pula de propósito.
  async function retentarTudo() {
    await Promise.all([
      tentarEnviarFila({ incluirComErro: true }),
      tentarEnviarFilaNaoFeito({ incluirComErro: true }),
      tentarEnviarFilaStatus({ incluirComErro: true }),
    ]);
  }

  useEffect(() => {
    void (async () => {
      await tentarEnviarFila();
      await tentarEnviarFilaNaoFeito();
      await tentarEnviarFilaStatus();
    })();

    function onOnline() {
      tentarEnviarFila();
      tentarEnviarFilaNaoFeito();
      tentarEnviarFilaStatus();
    }
    window.addEventListener("online", onOnline);
    // Além do evento "online" (que alguns celulares disparam com atraso ou
    // não disparam de forma confiável em wi-fi instável), tenta de novo a
    // cada 20s enquanto o navegador achar que está conectado. Só os itens
    // "pendente" — os "erro" esperam o toque em "Tentar novamente" (ver
    // opcoes.incluirComErro em lib/offline-sync.ts).
    const intervaloFila = setInterval(() => {
      if (navigator.onLine) {
        tentarEnviarFila();
        tentarEnviarFilaNaoFeito();
        tentarEnviarFilaStatus();
      }
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
    listHistoricoNaoFeito().then(setHistorico);

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
  const [relatorioAberto, setRelatorioAberto] = useState(false);
  const [relatorioCopiado, setRelatorioCopiado] = useState(false);
  // "Não será feito" fica de fora: já é uma decisão fechada, não algo que
  // ainda falta fazer.
  const pendentesRelatorio = useMemo(
    () => (data ? data.servicos.filter((s) => (s.status === "em_andamento" || s.status === "pendente") && !s.naoFeitoCategoria) : []),
    [data]
  );

  async function copiarRelatorio() {
    if (!data) return;
    const linhas = [data.resumo.nome.toUpperCase(), "O QUE FALTA"];
    for (const [st, titulo] of [["em_andamento", "EM ANDAMENTO"], ["pendente", "PENDENTE"]] as const) {
      const itens = pendentesRelatorio.filter((s) => s.status === st);
      if (itens.length === 0) continue;
      linhas.push("", "==============================", `${titulo} (${itens.length})`, "==============================");
      for (const s of itens) {
        linhas.push("", `OS ${s.numeroOS}`, s.problemaIdentificado, `Equipamento: ${s.equipamento}`);
        if (s.responsavel && pareceNomeDePessoa(s.responsavel)) linhas.push(`Responsável: ${s.responsavel}`);
      }
    }
    try {
      await navigator.clipboard.writeText(linhas.join("\n"));
      setRelatorioCopiado(true);
      setTimeout(() => setRelatorioCopiado(false), 2000);
    } catch {
      window.alert("Não foi possível copiar. Selecione o texto da lista e copie manualmente.");
    }
  }
  // A % do topo pode ignorar os serviços de "Oportunidade" (sem nº de OS,
  // abertos na hora em campo) pra mostrar só o andamento do que foi
  // programado. Só a barra muda — a lista de OS continua mostrando tudo.
  const [soProgramadas, setSoProgramadas] = useState(false);
  const baseBarra = data ? (soProgramadas ? data.servicos.filter((s) => s.numeroOS !== "Oportunidade") : data.servicos) : [];
  const oportunidadesCount = data ? data.servicos.filter((s) => s.numeroOS === "Oportunidade").length : 0;
  const barraTotal = baseBarra.length;
  const barraConcluidas = baseBarra.filter((s) => s.status === "concluido").length;
  const barraEmAndamento = baseBarra.filter((s) => s.status === "em_andamento").length;
  const percConcluido = barraTotal > 0 ? Math.round((barraConcluidas / barraTotal) * 100) : 0;

  // Consolidado das três filas offline (fotos, "não será feito", status) pro
  // banner único do topo — ver JSX mais abaixo. Um item com sincronizacao
  // "erro" continua contando em totalPendentesFila (ele não sai da fila só
  // porque falhou), então totalPendentesFila só chega a 0 quando não sobra
  // absolutamente nada — nem pendente, nem com erro.
  const totalPendentesFila = filaPendente.length + filaNaoFeitoPendente.length + filaStatusPendente.length;
  const totalComErro =
    filaPendente.filter((i) => i.sincronizacao === "erro").length +
    filaNaoFeitoPendente.filter((i) => i.sincronizacao === "erro").length +
    filaStatusPendente.filter((i) => i.sincronizacao === "erro").length;
  // Não esconder o diagnóstico atrás de "servidor recusou": em reta final,
  // saber qual OS falhou permite corrigir ou refazer somente aquela captura.
  const detalhesFilaComErro = [
    ...filaPendente.filter((i) => i.sincronizacao === "erro").map((i) => ({ servicoId: i.servicoId, tipo: `Foto ${i.etapa}`, erro: i.ultimoErro })),
    ...filaNaoFeitoPendente.filter((i) => i.sincronizacao === "erro").map((i) => ({ servicoId: i.servicoId, tipo: "Não será feito", erro: i.ultimoErro })),
    ...filaStatusPendente.filter((i) => i.sincronizacao === "erro").map((i) => ({ servicoId: i.servicoId, tipo: "Status", erro: i.ultimoErro })),
  ];
  const sincronizandoAlgumaFila = enviandoFila || enviandoNaoFeito || enviandoStatus;

  // "Sincronizado com sucesso": aparece só na TRANSIÇÃO de "tinha algo
  // pendente" pra "não tem mais nada pendente" — nunca por uma tentativa só
  // ter começado, e nunca se não havia nada pendente pra começo de conversa
  // (senão apareceria toda vez que a tela abre com a fila vazia). Reage a uma
  // mudança de estado ao longo do tempo, não inicializa nada — por isso é um
  // useEffect de verdade, não um cálculo que poderia rodar na renderização.
  const [mostrarSincronizado, setMostrarSincronizado] = useState(false);
  const totalPendentesAnteriorRef = useRef(0);
  useEffect(() => {
    const anterior = totalPendentesAnteriorRef.current;
    totalPendentesAnteriorRef.current = totalPendentesFila;
    if (anterior > 0 && totalPendentesFila === 0) {
      setMostrarSincronizado(true);
      const t = setTimeout(() => setMostrarSincronizado(false), 4000);
      return () => clearTimeout(t);
    }
  }, [totalPendentesFila]);

  // "responsavel" pode vir como dupla/trio ou como grupo de terceiros. Cada
  // pessoa vira um chip pelo nome completo; primeiro nome não é identificador
  // suficiente quando existem Carlos Henrique e Henrique no mesmo relatório.
  // A planilha às vezes traz lixo nessa coluna (número de turno, célula com
  // erro de acentuação virando "?????") — só vira chip o que parece nome de
  // gente de verdade (letras, pelo menos 2 caracteres).
  const pessoas = useMemo(() => {
    const vistos = new Map<string, string>();
    for (const s of servicosOrdenados) {
      for (const nome of separarResponsaveis(s.responsavel)) {
        const chave = nome.toLocaleLowerCase();
        if (!vistos.has(chave)) vistos.set(chave, nome);
      }
    }
    return Array.from(vistos.values()).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [servicosOrdenados]);

  const servicosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const base = pessoaFiltro
      ? servicosOrdenados.filter((s) => separarResponsaveis(s.responsavel).some((nome) => nome.toLocaleLowerCase() === pessoaFiltro.toLocaleLowerCase()))
      : termo
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
    if (termo || pessoaFiltro || mostrarConcluidas) return base;
    return base.filter((s) => s.status !== "concluido");
  }, [servicosOrdenados, busca, pessoaFiltro, mostrarConcluidas]);

  // As três funções abaixo também gravam a mudança no cache local (não só
  // no state) — sem isso, uma edição feita offline (foto, status, "não será
  // feito") sobrevivia até fechar o app, mas se reabrisse ainda sem sinal a
  // tela voltava a carregar a versão salva ANTES dessa edição.
  function handleCaptured(servicoId: string, patch: Partial<Servico>) {
    setData((prev) => {
      if (!prev) return prev;
      const atualizado = { ...prev, servicos: prev.servicos.map((s) => (s.id === servicoId ? { ...s, ...patch } : s)) };
      void salvarParadaCache(id, atualizado);
      return atualizado;
    });
  }

  function handleOsCriada(servico: Servico) {
    setData((prev) => {
      if (!prev) return prev;
      const atualizado = { ...prev, servicos: [...prev.servicos, servico] };
      void salvarParadaCache(id, atualizado);
      return atualizado;
    });
  }

  function handleEventoCriado(evento: TimelineEvento) {
    setData((prev) => {
      if (!prev) return prev;
      const atualizado = { ...prev, timeline: [...prev.timeline, evento] };
      void salvarParadaCache(id, atualizado);
      return atualizado;
    });
  }

  // Skeleton em vez de tela em branco — o layout dá pra antecipar (cabeçalho
  // + lista de cards), então mostrar a forma do que está vindo é melhor do
  // que uma tela vazia (que em campo, no sol, é fácil de confundir com "o
  // celular travou") e melhor do que só um texto "Carregando...".
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-slate-50 pb-16">
        <header className="border-b border-slate-200 bg-white px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 flex-none animate-pulse rounded-lg bg-slate-100" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-3.5 w-32 animate-pulse rounded bg-slate-100" />
              <div className="h-3 w-48 animate-pulse rounded bg-slate-100" />
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-lg space-y-3 px-4 py-5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="h-2.5 w-20 animate-pulse rounded bg-slate-100" />
              <div className="mt-2 h-4 w-3/4 animate-pulse rounded bg-slate-100" />
              <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-slate-100" />
              <div className="mt-4 h-11 animate-pulse rounded-lg bg-slate-100" />
            </div>
          ))}
        </main>
      </div>
    );
  }

  if (status === "not-found" || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-6 text-center">
        <AlertCircle size={28} className="text-warning-600" />
        <h1 className="text-lg font-bold text-slate-900">Relatório não encontrado</h1>
        <p className="max-w-xs text-sm text-slate-500">
          Se você está sem internet e nunca abriu esse relatório neste aparelho antes, não há uma versão salva pra mostrar offline.
        </p>
        <Link href="/" className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-700">
          Voltar ao Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      {/* Cabeçalho de ferramenta de campo: o número de conclusão é a leitura
          dominante (tipografia grande, sozinha), não mais duas barras finas
          de peso igual dividindo a atenção — em campo, sob sol, o que
          importa de relance é "quanto falta", não duas métricas ao mesmo
          tempo. Continua em fundo claro (não escuro) de propósito: contraste
          alto é o que se lê melhor ao ar livre, um hero escuro aqui
          trabalharia contra a própria leitura em campo. */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="flex items-center gap-3 px-4 pt-4">
          <Link href={`/parada/${id}`} className="flex h-9 w-9 flex-none items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <ArrowLeft size={18} />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="label-tecnico text-[10px] font-bold text-brand-500">Captura Rápida</p>
            <p className="truncate text-sm font-bold leading-tight text-slate-900">{data.resumo.nome}</p>
          </div>
          {pendentesCount > 0 && (
            <span className="flex-none rounded-full bg-warning-100 px-3 py-1.5 text-xs font-bold text-warning-600">
              {pendentesCount} sem foto
            </span>
          )}
        </div>
        {totalServicos > 0 && (
          <div className="px-4 pb-3 pt-4">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="label-tecnico text-[10px] font-bold text-slate-400">Concluído</p>
                <p className="font-display text-3xl font-bold leading-none tracking-tight text-slate-900">{percConcluido}%</p>
              </div>
              <div className="flex flex-col items-end gap-1 pb-0.5">
                <span className="text-xs font-bold text-slate-500">
                  {barraConcluidas}/{barraTotal} {soProgramadas ? "OS programadas" : "OS"}
                </span>
                {/* Segunda métrica ("em andamento") vira uma linha pequena, não
                    outra barra do mesmo tamanho — continua visível, mas some
                    quando não há nada nesse status, sem deixar ruído. */}
                {barraEmAndamento > 0 && (
                  <span className="flex items-center gap-1.5 text-[11px] font-bold text-brand-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                    {barraEmAndamento} em andamento
                  </span>
                )}
              </div>
            </div>
            <div className="mt-2.5 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-success-600 transition-all" style={{ width: `${percConcluido}%` }} />
            </div>
            {oportunidadesCount > 0 && (
              <label className="mt-2.5 flex items-center gap-2 text-[11px] font-bold text-slate-500">
                <input
                  type="checkbox"
                  checked={soProgramadas}
                  onChange={(e) => setSoProgramadas(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-brand-600"
                />
                Só OS programadas (sem as {oportunidadesCount} de oportunidade)
              </label>
            )}
          </div>
        )}
        <button
          type="button"
          onClick={() => atualizarComSpinner()}
          disabled={atualizando}
          className="label-tecnico flex min-h-10 w-full items-center justify-center gap-2 border-t border-slate-100 bg-slate-50 text-[10px] font-bold text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-60"
        >
          <RefreshCw size={13} className={atualizando ? "animate-spin" : undefined} />
          {atualizando
            ? "Atualizando..."
            : segundosAtras === null
              ? "Atualizar"
              : segundosAtras < 3
                ? "Atualizado agora — toque para atualizar"
                : `Atualizado há ${segundosAtras}s — toque para atualizar`}
        </button>
        <button
          type="button"
          onClick={() => setRelatorioAberto(true)}
          className="flex min-h-11 w-full items-center justify-center gap-2 border-t border-slate-100 bg-white text-xs font-bold text-brand-700 transition-colors hover:bg-brand-50"
        >
          <ClipboardList size={14} />
          Relatório do que falta ({pendentesRelatorio.length})
        </button>
      </header>

      {relatorioAberto && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 sm:items-center" onClick={() => setRelatorioAberto(false)}>
          <div
            className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <p className="text-sm font-bold text-slate-900">Em andamento e pendentes</p>
              <button type="button" onClick={() => setRelatorioAberto(false)} aria-label="Fechar" className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-3">
              {pendentesRelatorio.length === 0 && <p className="py-8 text-center text-sm text-slate-400">Nenhuma OS em andamento ou pendente.</p>}
              {(["em_andamento", "pendente"] as const).map((st) => {
                const itens = pendentesRelatorio.filter((s) => s.status === st);
                if (itens.length === 0) return null;
                return (
                  <div key={st}>
                    <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      {st === "em_andamento" ? "Em andamento" : "Pendente"} ({itens.length})
                    </p>
                    <ul className="space-y-1.5">
                      {itens.map((s) => (
                        <li key={s.id} className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700">
                          <span className="font-bold text-brand-700">OS {s.numeroOS}</span> — {s.problemaIdentificado}
                          <span className="block text-slate-400">
                            {s.equipamento}
                            {s.responsavel && pareceNomeDePessoa(s.responsavel) ? ` · ${s.responsavel}` : ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
            <div className="border-t border-slate-100 p-3">
              <button
                type="button"
                onClick={copiarRelatorio}
                disabled={pendentesRelatorio.length === 0}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                <Copy size={16} />
                {relatorioCopiado ? "Copiado!" : "Copiar texto (WhatsApp / Mantec)"}
              </button>
            </div>
          </div>
        </div>
      )}

      {usandoCache !== null && (
        // Diferente da fila de sincronização (uma ação pendente de enviar),
        // isso aqui avisa que a TELA INTEIRA é uma versão salva — o que está
        // sendo mostrado pode já estar desatualizado em relação ao que outra
        // pessoa mudou nesse relatório enquanto sem sinal.
        <div className="flex items-center gap-2.5 border-b border-warning-200 bg-warning-50 px-4 py-2.5 text-xs font-bold text-warning-700">
          <CloudOff size={14} className="flex-none" />
          Sem internet — mostrando dados salvos às {new Date(usandoCache).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
        </div>
      )}

      {/* Indicador único de sincronização — consolidado das três filas
          (fotos, "não será feito", status) em vez de um banner por fila, que
          empilhava até três avisos repetindo a mesma ideia. Aparece quando: há
          algo pendente, a conexão caiu (mesmo sem nada na fila ainda — sem
          isso, abrir a tela já offline não avisava nada até a primeira ação
          falhar), ou acabou de terminar de sincronizar tudo.

          Formato de chip flutuante (recuado das bordas, cantos totalmente
          arredondados, sombra) em vez de barra full-width — lê como um
          aviso pontual que se pode ignorar, não como uma trava na tela. */}
      {(!online || totalPendentesFila > 0 || mostrarSincronizado) && (
        <div className="px-4 pt-3">
          <div
            className={cn(
              "flex flex-wrap items-center gap-2.5 rounded-2xl border px-4 py-2.5 text-xs font-bold shadow-sm",
              totalComErro > 0 ? "border-danger-200 bg-danger-50 text-danger-700" : "border-warning-200 bg-warning-50 text-warning-700"
            )}
          >
            {sincronizandoAlgumaFila ? (
              <Loader2 size={14} className="flex-none animate-spin" />
            ) : totalComErro > 0 ? (
              <AlertCircle size={14} className="flex-none" />
            ) : !online ? (
              <WifiOff size={14} className="flex-none" />
            ) : totalPendentesFila > 0 ? (
              <CloudOff size={14} className="flex-none" />
            ) : (
              <CheckCircle2 size={14} className="flex-none text-success-600" />
            )}
            <span className="flex-1">
              {sincronizandoAlgumaFila
                ? `Sincronizando ${totalPendentesFila} ${totalPendentesFila === 1 ? "item" : "itens"}...`
                : totalComErro > 0
                  ? `${totalComErro} ${totalComErro === 1 ? "item não sincronizou" : "itens não sincronizaram"} — servidor recusou a alteração`
                  : totalPendentesFila > 0
                    ? `Salvo neste aparelho. ${totalPendentesFila} ${totalPendentesFila === 1 ? "item" : "itens"} — será${totalPendentesFila === 1 ? "" : "ão"} sincronizado${totalPendentesFila === 1 ? "" : "s"} quando a conexão voltar.`
                    : !online
                      ? "Sem conexão — o que você registrar agora fica salvo neste aparelho."
                      : "Sincronizado com sucesso."}
            </span>
            {totalComErro > 0 && (
              <button
                type="button"
                onClick={() => void retentarTudo()}
                className="flex-none rounded-full bg-danger-600 px-3 py-1.5 text-[11px] font-bold text-white transition-transform active:scale-[0.98]"
              >
                Tentar novamente
              </button>
            )}
            {totalComErro > 0 && (
              <ul className="w-full space-y-1 border-t border-danger-200 pt-2 text-[11px] font-semibold text-danger-800">
                {detalhesFilaComErro.slice(0, 5).map((item, index) => {
                  const os = data?.servicos.find((servico) => servico.id === item.servicoId)?.numeroOS;
                  return <li key={`${item.servicoId}-${index}`}>{item.tipo} · {os ? `OS ${os}` : "OS não encontrada"}: {item.erro || "Motivo não informado."}</li>;
                })}
              </ul>
            )}
          </div>
        </div>
      )}

      <main className="mx-auto max-w-lg space-y-3 px-4 py-5">
        <GanttDeCampo data={data} agora={horaAgora} />
        <NovaOsForm paradaId={id} onCriada={handleOsCriada} />
        <div className="rounded-2xl border border-slate-200 bg-white p-3"><p className="mb-2 px-1 text-[10px] font-extrabold uppercase tracking-wide text-slate-400">Diário do planejador</p><NovoEventoForm paradaId={id} onCriado={handleEventoCriado} /></div>

        {totalServicos > 0 && (
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={busca}
              onChange={(e) => { setBusca(e.target.value); setPessoaFiltro(""); }}
              placeholder="Buscar por OS, equipamento ou responsável"
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-9 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            />
            {busca && (
              <button
                type="button"
                onClick={() => { setBusca(""); setPessoaFiltro(""); }}
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
            className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-200 bg-white text-xs font-bold text-slate-500 transition-colors hover:bg-slate-50"
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
              const ativo = pessoaFiltro.toLowerCase() === nome.toLowerCase();
              return (
                <button
                  key={nome}
                  type="button"
                  onClick={() => { setPessoaFiltro(ativo ? "" : nome); setBusca(""); }}
                  className={cn(
                    // A fila rola na horizontal em vez de quebrar linha, entao
                    // subir de 30px pra 44px nao empurra chip nenhum pra fora:
                    // continua cabendo a mesma quantidade na tela, so que agora
                    // cada um da pra acertar sem mirar.
                    "flex min-h-11 flex-none items-center rounded-full border px-3.5 text-xs font-bold transition-colors",
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
              pendenteNaoFeito={filaNaoFeitoPendente.some((f) => f.servicoId === servico.id)}
              onEnfileirarNaoFeito={enfileirarNaoFeito}
              pendenteStatus={filaStatusPendente.some((f) => f.servicoId === servico.id)}
              onEnfileirarStatus={enfileirarStatus}
              historicoNaoFeito={encontrarUltimoNaoFeito(servico, id, historico)}
            />
          ))
        )}
      </main>
    </div>
  );
}

export function CapturaRapida({ id }: { id: string }) {
  const { ready, isEditor, unlock } = useEditorMode();
  // A dica visual de editor vive em um cookie legível pelo navegador; a
  // autorização real é httpOnly e pode ter vencido. Só monta a Captura (e as
  // rotinas automáticas de sincronização) depois de confirmar a sessão real.
  const [sessaoConfirmada, setSessaoConfirmada] = useState<boolean | null>(null);

  function confirmarSessao() {
    setSessaoConfirmada(null);
    sessaoAtiva().then(setSessaoConfirmada).catch(() => setSessaoConfirmada(false));
  }

  useEffect(() => {
    let ativa = true;
    if (!isEditor) {
      setSessaoConfirmada(false);
      return () => { ativa = false; };
    }
    setSessaoConfirmada(null);
    sessaoAtiva().then((valida) => { if (ativa) setSessaoConfirmada(valida); }).catch(() => { if (ativa) setSessaoConfirmada(false); });
    return () => { ativa = false; };
  }, [isEditor]);

  if (!ready) return <div className="min-h-screen bg-slate-50" />;

  if (isEditor && sessaoConfirmada === null) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-center text-sm font-semibold text-slate-500">Confirmando acesso seguro…</div>;
  }

  if (!isEditor || !sessaoConfirmada) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-50 px-6">
        <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <EditorPasswordForm onUnlock={unlock} onSuccess={confirmarSessao} titulo="Acesso Restrito" descricao="Digite a senha para registrar fotos em campo." />
        </div>
        <Link href={`/parada/${id}`} className="text-sm font-semibold text-slate-400 hover:text-slate-700">
          Voltar ao Relatório
        </Link>
      </div>
    );
  }

  return <CapturaRapidaConteudo id={id} onSessaoExpirada={() => setSessaoConfirmada(false)} />;
}
