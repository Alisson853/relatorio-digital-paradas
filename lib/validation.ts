import {
  MOTIVOS_NAO_FEITO,
  type CaminhoCriticoItem,
  type Equipe,
  type GraficosData,
  type Kpis,
  type MotivoNaoFeitoCategoria,
  type ParadaCompleta,
  type ParadaResumo,
  type Pendencia,
  type ResultadoFinal,
  type Servico,
  type StatusGeral,
  type StatusItem,
  type TimelineEvento,
} from "@/lib/types";

// Saneamento do que chega do cliente antes de encostar no banco.
//
// O problema que isto resolve é mass assignment: saveParada() recebia o objeto
// ParadaCompleta inteiro e o repassava direto pro insert. O tipo TypeScript
// some na compilação — em runtime o que chega numa Server Action é o JSON que
// o navegador mandou, e nada impedia mandar um "status" inventado, um número
// negativo de horas, um texto de 50 MB ou uma URL de foto apontando pra fora.
//
// A estratégia aqui é reconstruir cada objeto campo a campo, e não "checar e
// deixar passar". Assim campo desconhecido não é rejeitado com erro: ele
// simplesmente não é copiado, e nunca chega ao banco.

const LIMITE_TEXTO_CURTO = 200;
const LIMITE_TEXTO_LONGO = 5000;
const LIMITE_URL = 2000;
const LIMITE_ITENS = 500;

const STATUS_GERAL: StatusGeral[] = ["concluida", "ressalvas", "em_andamento"];
const STATUS_ITEM: StatusItem[] = ["concluido", "atrasado", "pendente", "em_andamento"];
const EQUIPES: Equipe[] = ["Elétrica", "Mecânica", "Instrumentação", "Operação", "Segurança", "Civil", "Caldeiraria", "Preditiva", "Lubrificação"];
const ICONES: TimelineEvento["icone"][] = ["flag", "lock", "wrench", "swap", "search", "check-circle", "play", "unlock"];

// Caracteres de controle ASCII (0x00–0x1F e 0x7F). O \0 no meio de uma string
// trunca o valor em vários drivers de banco, e os demais sujam export e PDF
// sem aparecer na tela — some com todos antes de gravar.
const CONTROLE = /[\u0000-\u001F\u007F]/g;

export class DadosInvalidosError extends Error {}

function texto(valor: unknown, limite = LIMITE_TEXTO_CURTO): string {
  if (typeof valor !== "string") return "";
  // Corta caracteres de controle (inclusive \0, que trunca string em alguns
  // drivers) e limita o tamanho — sem teto, um único relatório podia encher a
  // linha inteira do Postgres e derrubar todas as telas que a carregam.
  return valor.replace(CONTROLE, "").slice(0, limite);
}

function textoObrigatorio(valor: unknown, campo: string, limite = LIMITE_TEXTO_CURTO): string {
  const limpo = texto(valor, limite).trim();
  if (!limpo) throw new DadosInvalidosError(`Campo obrigatório ausente: ${campo}.`);
  return limpo;
}

function numero(valor: unknown, { min = 0, max = 1_000_000 } = {}): number {
  const n = typeof valor === "number" ? valor : Number(valor);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function umDe<T extends string>(valor: unknown, permitidos: T[], padrao: T): T {
  return permitidos.includes(valor as T) ? (valor as T) : padrao;
}

// Igual a umDe, mas sem valor padrão — usado quando "não é nenhuma das
// opções" precisa virar ausência (undefined), não uma opção qualquer
// escolhida por default. É o caso da categoria de "não será feito": um valor
// inválido/ausente tem que significar "não marcado", não silenciosamente
// virar "Outro" ou a primeira opção da lista.
function umDeOpcional<T extends string>(valor: unknown, permitidos: readonly T[]): T | undefined {
  return permitidos.includes(valor as T) ? (valor as T) : undefined;
}

function lista<T>(valor: unknown, mapeia: (item: unknown) => T): T[] {
  if (!Array.isArray(valor)) return [];
  // Teto de itens: sem ele, um array de um milhão de entradas passa pelo
  // validador item a item e só falha lá no banco, depois de queimar a função.
  return valor.slice(0, LIMITE_ITENS).map(mapeia);
}

// Só aceita imagem de onde a gente realmente publica: o Blob da Vercel (upload
// feito por uploadFoto), um caminho relativo do próprio site, ou o placeholder
// interno "sem foto". Sem isso, quem tem a senha podia gravar uma URL de
// terceiros no relatório — e cada pessoa que abrisse a apresentação faria uma
// requisição pra esse servidor, entregando IP e horário de quem está vendo.
function urlDeImagem(valor: unknown): string {
  const bruto = texto(valor, LIMITE_URL).trim();
  if (!bruto) return "";
  if (bruto.startsWith("data:image/svg+xml;utf8,")) return bruto; // placeholder interno
  if (bruto.startsWith("/")) return bruto;
  try {
    const url = new URL(bruto);
    if (url.protocol !== "https:") return "";
    const permitido = url.hostname.endsWith(".public.blob.vercel-storage.com") || url.hostname === "picsum.photos";
    return permitido ? url.toString() : "";
  } catch {
    return "";
  }
}

export function urlDeFotoValida(valor: unknown): string | null {
  const url = urlDeImagem(valor);
  return url && !url.startsWith("data:") ? url : null;
}

function sanearResumo(bruto: unknown): ParadaResumo {
  const r = (bruto ?? {}) as Record<string, unknown>;
  return {
    // O id vira parte da URL pública do relatório e da chave primária —
    // restringe ao que é seguro numa rota, sem barra nem ponto (que abririam
    // travessia de caminho em /parada/[id] e nas rotas de export).
    id: textoObrigatorio(r.id, "id", 120).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 120) || (() => {
      throw new DadosInvalidosError("Id do relatório inválido.");
    })(),
    nome: textoObrigatorio(r.nome, "nome"),
    maquina: texto(r.maquina),
    area: texto(r.area),
    data: texto(r.data, 40),
    duracaoPlanejada: texto(r.duracaoPlanejada, 40),
    duracaoRealizada: texto(r.duracaoRealizada, 40),
    status: umDe(r.status, STATUS_GERAL, "em_andamento"),
    responsavel: texto(r.responsavel),
    imagem: urlDeImagem(r.imagem),
    fotosMaquina: lista(r.fotosMaquina, urlDeImagem).filter(Boolean),
  };
}

function sanearKpis(bruto: unknown): Kpis {
  const k = (bruto ?? {}) as Record<string, unknown>;
  return {
    osPlanejadas: numero(k.osPlanejadas, { max: 100_000 }),
    osConcluidas: numero(k.osConcluidas, { max: 100_000 }),
    eficiencia: numero(k.eficiencia, { max: 100 }),
    horasTrabalhadas: numero(k.horasTrabalhadas, { max: 100_000 }),
    equipeEletrica: numero(k.equipeEletrica, { max: 100_000 }),
    equipeMecanica: numero(k.equipeMecanica, { max: 100_000 }),
    equipeInstrumentacao: numero(k.equipeInstrumentacao, { max: 100_000 }),
    seguranca: numero(k.seguranca, { max: 100 }),
    pendencias: numero(k.pendencias, { max: 100_000 }),
    etiquetaVermelha: numero(k.etiquetaVermelha, { max: 100_000 }),
    etiquetaAmarela: numero(k.etiquetaAmarela, { max: 100_000 }),
  };
}

export function sanearServico(bruto: unknown): Servico {
  const s = (bruto ?? {}) as Record<string, unknown>;
  return {
    id: texto(s.id, 80) || crypto.randomUUID(),
    numeroOS: texto(s.numeroOS, 80),
    titulo: texto(s.titulo),
    equipamento: texto(s.equipamento),
    area: texto(s.area),
    responsavel: texto(s.responsavel),
    equipe: umDe(s.equipe, EQUIPES, "Mecânica"),
    horaInicio: texto(s.horaInicio, 20),
    horaFim: texto(s.horaFim, 20),
    tempoGasto: texto(s.tempoGasto, 20),
    problemaIdentificado: texto(s.problemaIdentificado, LIMITE_TEXTO_LONGO),
    servicoExecutado: texto(s.servicoExecutado, LIMITE_TEXTO_LONGO),
    resultado: texto(s.resultado, LIMITE_TEXTO_LONGO),
    status: umDe(s.status, STATUS_ITEM, "pendente"),
    fotoAntes: urlDeImagem(s.fotoAntes),
    fotoAntesHorario: texto(s.fotoAntesHorario, 20) || undefined,
    fotoDurante: urlDeImagem(s.fotoDurante) || undefined,
    fotoDuranteHorario: texto(s.fotoDuranteHorario, 20) || undefined,
    fotoDepois: urlDeImagem(s.fotoDepois),
    fotoDepoisHorario: texto(s.fotoDepoisHorario, 20) || undefined,
    categoria: texto(s.categoria) || undefined,
    naoFeitoCategoria: umDeOpcional<MotivoNaoFeitoCategoria>(s.naoFeitoCategoria, MOTIVOS_NAO_FEITO),
    justificativaNaoFeito: texto(s.justificativaNaoFeito, LIMITE_TEXTO_LONGO) || undefined,
  };
}

function sanearTimeline(bruto: unknown): TimelineEvento {
  const t = (bruto ?? {}) as Record<string, unknown>;
  return {
    id: texto(t.id, 80) || crypto.randomUUID(),
    horario: texto(t.horario, 20),
    titulo: texto(t.titulo),
    responsavel: texto(t.responsavel),
    descricao: texto(t.descricao, LIMITE_TEXTO_LONGO),
    icone: umDe(t.icone, ICONES, "flag"),
    status: umDe(t.status, STATUS_ITEM, "pendente"),
  };
}

function sanearCaminho(bruto: unknown): CaminhoCriticoItem {
  const c = (bruto ?? {}) as Record<string, unknown>;
  return {
    id: texto(c.id, 80) || crypto.randomUUID(),
    servico: texto(c.servico),
    inicioPlanejado: texto(c.inicioPlanejado, 20),
    fimPlanejado: texto(c.fimPlanejado, 20),
    inicioReal: texto(c.inicioReal, 20),
    fimReal: texto(c.fimReal, 20),
    diferencaMin: numero(c.diferencaMin, { min: -100_000, max: 100_000 }),
    responsavel: texto(c.responsavel),
    status: umDe(c.status, STATUS_ITEM, "pendente"),
    causaAtraso: texto(c.causaAtraso) || undefined,
  };
}

function sanearPendencia(bruto: unknown): Pendencia {
  const p = (bruto ?? {}) as Record<string, unknown>;
  return {
    id: texto(p.id, 80) || crypto.randomUUID(),
    item: texto(p.item, LIMITE_TEXTO_LONGO),
    motivo: texto(p.motivo, LIMITE_TEXTO_LONGO),
  };
}

function sanearGraficos(bruto: unknown): GraficosData {
  const g = (bruto ?? {}) as Record<string, unknown>;
  const par = <A extends string, B extends string>(chaveA: A, chaveB: B, maxB = 100_000) =>
    (item: unknown) => {
      const o = (item ?? {}) as Record<string, unknown>;
      return { [chaveA]: texto(o[chaveA]), [chaveB]: numero(o[chaveB], { max: maxB }) } as Record<A, string> & Record<B, number>;
    };

  return {
    osPorEquipe: lista(g.osPorEquipe, par("equipe", "quantidade")),
    horasPorSetor: lista(g.horasPorSetor, par("setor", "horas")),
    horasPorServico: lista(g.horasPorServico, par("servico", "horas")),
    distribuicaoServicos: lista(g.distribuicaoServicos, par("categoria", "valor")),
    paretoAtrasos: lista(g.paretoAtrasos, (item) => {
      const o = (item ?? {}) as Record<string, unknown>;
      return { causa: texto(o.causa), horas: numero(o.horas), acumulado: numero(o.acumulado, { max: 100 }) };
    }),
    planejadoRealizado: lista(g.planejadoRealizado, (item) => {
      const o = (item ?? {}) as Record<string, unknown>;
      return { etapa: texto(o.etapa), planejado: numero(o.planejado), realizado: numero(o.realizado) };
    }),
    percentualConcluido: numero(g.percentualConcluido, { max: 100 }),
  };
}

function sanearResultado(bruto: unknown): ResultadoFinal {
  const r = (bruto ?? {}) as Record<string, unknown>;
  return {
    tempoPlanejadoHoras: numero(r.tempoPlanejadoHoras, { max: 100_000 }),
    tempoRealizadoHoras: numero(r.tempoRealizadoHoras, { max: 100_000 }),
    eficiencia: numero(r.eficiencia, { max: 100 }),
    disponibilidade: numero(r.disponibilidade, { max: 100 }),
    pendenciasAbertas: numero(r.pendenciasAbertas, { max: 100_000 }),
    selo: umDe(r.selo, STATUS_GERAL, "em_andamento"),
    resumo: texto(r.resumo, LIMITE_TEXTO_LONGO),
    // Valor ausente/inválido vira `false` (não `undefined`): o formulário usa
    // este campo pra decidir se mostra o resumo no campo editável ou deixa em
    // branco (regeneração automática) — tratar "não sei" como "não é
    // automático" nunca some com um texto que a pessoa escreveu.
    resumoAutomatico: typeof r.resumoAutomatico === "boolean" ? r.resumoAutomatico : false,
  };
}

// Reconstrói o relatório inteiro a partir do que chegou. Note que "fotos" não
// entra: é derivado dos serviços (deriveFotos) e nunca foi persistido — copiar
// o que o cliente mandasse ali seria aceitar dado que o servidor já calcula.
export function sanearParadaCompleta(bruto: unknown): ParadaCompleta {
  if (!bruto || typeof bruto !== "object") throw new DadosInvalidosError("Relatório inválido.");
  const p = bruto as Record<string, unknown>;
  return {
    resumo: sanearResumo(p.resumo),
    kpis: sanearKpis(p.kpis),
    timeline: lista(p.timeline, sanearTimeline),
    servicos: lista(p.servicos, sanearServico),
    fotos: [],
    caminhoCritico: lista(p.caminhoCritico, sanearCaminho),
    pendencias: lista(p.pendencias, sanearPendencia),
    graficos: sanearGraficos(p.graficos),
    resultadoFinal: sanearResultado(p.resultadoFinal),
  };
}

// Id vindo da URL ou de um parâmetro de ação. Mesma regra do id do resumo.
export function sanearId(valor: unknown): string {
  const limpo = texto(valor, 120).replace(/[^a-zA-Z0-9_-]/g, "");
  if (!limpo) throw new DadosInvalidosError("Identificador inválido.");
  return limpo;
}

export function sanearStatusItem(valor: unknown): StatusItem {
  if (!STATUS_ITEM.includes(valor as StatusItem)) throw new DadosInvalidosError("Status inválido.");
  return valor as StatusItem;
}

export function sanearEquipe(valor: unknown): Equipe {
  return umDe(valor, EQUIPES, "Mecânica");
}

export function sanearIcone(valor: unknown): TimelineEvento["icone"] {
  return umDe(valor, ICONES, "flag");
}

// String vazia é um valor válido aqui — é o que desmarca "não será feito".
// Qualquer outra coisa que não seja uma das categorias fechadas é rejeitada.
export function sanearMotivoNaoFeito(valor: unknown): MotivoNaoFeitoCategoria | "" {
  if (valor === "") return "";
  return umDeOpcional<MotivoNaoFeitoCategoria>(valor, MOTIVOS_NAO_FEITO) ?? "";
}

export { texto as sanearTexto };

// ---------------------------------------------------------------------------
// Upload de imagem: confere o que o arquivo É, não o que ele diz ser
// ---------------------------------------------------------------------------
//
// A checagem anterior era `file.type.startsWith("image/")`. Esse campo vem do
// FormData montado pelo navegador — ou seja, do cliente — e não é verificado
// por ninguém: um script pode declarar "image/jpeg" e mandar HTML, SVG ou um
// executável. O arquivo iria pro Blob público com esse rótulo, e o Blob serve
// o que recebe.
//
// Aqui a decisão passa a ser tomada pelos primeiros bytes do arquivo, que são
// o próprio formato. Só três formatos entram, e é de propósito: o cliente
// sempre comprime a foto pra JPEG (compressImageFile) antes de enviar, então
// JPEG é o único que aparece na prática; PNG e WebP ficam como folga para o
// dia em que a compressão mudar.
//
// SVG fica de fora não por acaso: SVG é XML e pode carregar <script>. Servido
// do domínio do Blob ele não alcança o cookie de sessão deste site, mas
// continua sendo uma página executável hospedada com a nossa cara — e não
// existe motivo nenhum pra uma foto de equipamento ser SVG.

export type TipoImagem = "image/jpeg" | "image/png" | "image/webp";

const ASSINATURAS: Array<{ tipo: TipoImagem; extensao: string; casa: (b: Uint8Array) => boolean }> = [
  // FF D8 FF — todo JPEG começa assim (SOI seguido do primeiro marcador).
  { tipo: "image/jpeg", extensao: ".jpg", casa: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  // 89 "PNG" CR LF 1A LF — a assinatura de 8 bytes do PNG.
  {
    tipo: "image/png",
    extensao: ".png",
    casa: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a,
  },
  // "RIFF" .... "WEBP" — contêiner RIFF com o tipo WEBP no byte 8.
  {
    tipo: "image/webp",
    extensao: ".webp",
    casa: (b) =>
      b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50,
  },
];

export interface ImagemDetectada {
  tipo: TipoImagem;
  extensao: string;
}

// Lê só os 12 primeiros bytes: é o bastante pras três assinaturas e não carrega
// o arquivo inteiro na memória da função só pra decidir se ele vale a pena.
export async function detectarImagem(arquivo: Blob): Promise<ImagemDetectada | null> {
  const cabecalho = new Uint8Array(await arquivo.slice(0, 12).arrayBuffer());
  if (cabecalho.length < 12) return null;
  const encontrada = ASSINATURAS.find((a) => a.casa(cabecalho));
  return encontrada ? { tipo: encontrada.tipo, extensao: encontrada.extensao } : null;
}
