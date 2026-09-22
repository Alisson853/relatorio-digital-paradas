"use server";

import { del, put } from "@vercel/blob";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { sufixoAleatorio } from "@/lib/utils";
import { paradas } from "@/lib/db/schema";
import type { CaminhoCriticoItem, Equipe, Kpis, MotivoNaoFeitoCategoria, ParadaCompleta, ParadaResumo, Servico, StatusItem, TimelineEvento } from "@/lib/types";
import type { HistoricoNaoFeitoItem } from "@/lib/historico-nao-feito";
import { deriveFotoCapa, deriveFotos, deriveGraficos, deriveKpis, gerarDescricaoExecucao, parseHoras, textoResultadoPadrao } from "@/lib/derive";
import { gerarResultadoFinal } from "@/lib/mock-data";
import { NO_PHOTO_PLACEHOLDER } from "@/lib/image-utils";
import { ehEditor } from "@/lib/auth/session";
import { consumirLimite, identificarRequisitante, limiteExcedidoMsg } from "@/lib/rate-limit";
import {
  DadosInvalidosError,
  sanearEquipe,
  sanearIcone,
  sanearId,
  sanearMotivoNaoFeito,
  sanearParadaCompleta,
  sanearStatusItem,
  sanearTexto,
  urlDeFotoValida,
  detectarImagem,
} from "@/lib/validation";

// Versao "silenciosa" do sanearId, pras leituras publicas: em vez de lancar
// (o que virava um erro 500 numa URL digitada errada), devolve null e o chamador
// responde "nao encontrado", que e a resposta correta e nao conta ao visitante
// se o id existe, se e invalido ou se ele nao tem acesso.
function idSeguro(bruto: unknown): string | null {
  try {
    return sanearId(bruto);
  } catch {
    return null;
  }
}

// As telas de lista (home e historico) nunca mostram timeline, caminho critico,
// pendencias, graficos nem resultado final — mas o `select()` sem argumentos
// trazia tudo isso, um jsonb grande por relatorio, em toda visita. Dizer
// exatamente quais colunas interessam faz o banco mandar menos, o servidor
// segurar menos na memoria e reduz o estrago de qualquer descuido futuro que
// devolva a linha inteira ao cliente por engano.
//
// `servicos` continua na lista porque rowParaResumo depende dele pra escolher a
// foto de capa quando fotosMaquina esta vazio (deriveFotoCapa).
const COLUNAS_RESUMO = {
  id: paradas.id,
  nome: paradas.nome,
  maquina: paradas.maquina,
  area: paradas.area,
  data: paradas.data,
  duracaoPlanejada: paradas.duracaoPlanejada,
  duracaoRealizada: paradas.duracaoRealizada,
  status: paradas.status,
  responsavel: paradas.responsavel,
  imagem: paradas.imagem,
  fotosMaquina: paradas.fotosMaquina,
  servicos: paradas.servicos,
} as const;

type LinhaResumo = Pick<typeof paradas.$inferSelect, keyof typeof COLUNAS_RESUMO>;

function rowParaResumo(row: LinhaResumo): ParadaResumo {
  const fotosMaquina = row.fotosMaquina?.length ? row.fotosMaquina : [deriveFotoCapa(row.servicos)].filter((v): v is string => !!v);
  return {
    id: row.id,
    nome: row.nome,
    maquina: row.maquina,
    area: row.area,
    data: row.data,
    duracaoPlanejada: row.duracaoPlanejada,
    duracaoRealizada: row.duracaoRealizada,
    status: row.status as ParadaResumo["status"],
    responsavel: row.responsavel,
    imagem: row.imagem,
    fotosMaquina,
  };
}

function rowParaCompleta(row: typeof paradas.$inferSelect): ParadaCompleta {
  return {
    resumo: rowParaResumo(row),
    kpis: row.kpis,
    timeline: row.timeline,
    servicos: row.servicos,
    fotos: deriveFotos(row.servicos),
    caminhoCritico: row.caminhoCritico,
    pendencias: row.pendencias,
    // Relatórios salvos antes de um campo novo existir (ex: horasPorServico)
    // não têm ele no JSON persistido — sem esse fallback, a tela quebra ao
    // tentar .map() em undefined assim que um campo novo é adicionado ao tipo.
    graficos: { ...row.graficos, horasPorServico: row.graficos.horasPorServico ?? [] },
    resultadoFinal: row.resultadoFinal,
  };
}

export async function listParadasResumo(): Promise<ParadaResumo[]> {
  const rows = await getDb().select(COLUNAS_RESUMO).from(paradas).orderBy(asc(paradas.data));
  return rows.map(rowParaResumo).reverse();
}

export async function getParadaCompleta(idBruto: string): Promise<ParadaCompleta | null> {
  // Leitura publica, mas nem por isso o id entra cru na consulta. O Drizzle ja
  // manda o valor como parametro (nao ha concatenacao de SQL em lugar nenhum
  // deste app), entao o ganho aqui nao e contra injecao: e recusar de vez o
  // que nunca poderia ser um id — id inexistente e id malformado passam a dar
  // a mesma resposta, "nao encontrado", em vez de o malformado chegar ao banco.
  const id = idSeguro(idBruto);
  if (!id) return null;

  const [row] = await getDb().select().from(paradas).where(eq(paradas.id, id)).limit(1);
  return row ? rowParaCompleta(row) : null;
}

export interface ParadaHistoricoItem {
  resumo: ParadaResumo;
  kpis: Kpis;
}

// Uma linha por relatório com só o que a página de Histórico precisa —
// evita carregar servicos/fotos/graficos inteiros de cada parada só pra
// comparar KPIs entre elas.
export async function listParadasHistorico(): Promise<ParadaHistoricoItem[]> {
  // Cruza indicadores de TODOS os relatorios — mesma sensibilidade do backup
  // completo e do checklist de pendencias, e a mesma regra: exige sessao.
  // Ver UM relatorio continua publico (e o que o QR code da capa abre); somar
  // todos numa serie historica, nao.
  if (!(await ehEditor())) return [];

  const rows = await getDb()
    .select({ ...COLUNAS_RESUMO, kpis: paradas.kpis })
    .from(paradas)
    .orderBy(asc(paradas.data));
  return rows.map((row) => ({ resumo: rowParaResumo(row), kpis: row.kpis }));
}

// Exporta TODOS os relatórios de uma vez (fotos, responsáveis, tudo) — bem
// mais sensível que abrir um relatório específico, então, diferente de
// listParadasResumo/getParadaCompleta (usadas pras páginas públicas de
// visualização), essa aqui exige a senha de editor como qualquer escrita.
export async function exportarBackupCompleto(): Promise<{ ok: boolean; erro?: string; dados?: ParadaCompleta[] }> {
  const autorizado = await ehEditor();
  if (!autorizado) return { ok: false, erro: "Não autorizado." };

  const rows = await getDb().select().from(paradas).orderBy(asc(paradas.data));
  return { ok: true, dados: rows.map(rowParaCompleta).reverse() };
}

export async function getParadaAtualizadaEm(idBruto: string): Promise<number | null> {
  const id = idSeguro(idBruto);
  if (!id) return null;

  const [row] = await getDb().select({ atualizadoEm: paradas.atualizadoEm }).from(paradas).where(eq(paradas.id, id)).limit(1);
  return row ? row.atualizadoEm.getTime() : null;
}

export async function saveParada(dataBruta: unknown): Promise<{ ok: boolean; erro?: string }> {
  const autorizado = await ehEditor();
  if (!autorizado) return { ok: false, erro: "Não autorizado." };

  const limite = await consumirLimite(`escrita:${await identificarRequisitante()}`, 60, 60);
  if (!limite.permitido) return { ok: false, erro: limiteExcedidoMsg() };

  // O relatorio inteiro e reconstruido campo a campo antes de ir pro banco.
  // Aqui esta o coracao da defesa contra mass assignment: o que o cliente
  // mandou nunca chega ao insert; o que chega e o objeto que sanearParadaCompleta
  // montou a partir dele, com enums, tetos de tamanho e URLs conferidos.
  let data: ParadaCompleta;
  try {
    data = sanearParadaCompleta(dataBruta);
  } catch (erro) {
    return { ok: false, erro: erro instanceof DadosInvalidosError ? erro.message : "Relatorio invalido." };
  }

  const { resumo } = data;
  await getDb()
    .insert(paradas)
    .values({
      id: resumo.id,
      nome: resumo.nome,
      maquina: resumo.maquina,
      area: resumo.area,
      data: resumo.data,
      duracaoPlanejada: resumo.duracaoPlanejada,
      duracaoRealizada: resumo.duracaoRealizada,
      status: resumo.status,
      responsavel: resumo.responsavel,
      imagem: resumo.imagem,
      fotosMaquina: resumo.fotosMaquina ?? [],
      kpis: data.kpis,
      timeline: data.timeline,
      servicos: data.servicos,
      caminhoCritico: data.caminhoCritico,
      pendencias: data.pendencias,
      graficos: data.graficos,
      resultadoFinal: data.resultadoFinal,
      atualizadoEm: new Date(),
    })
    .onConflictDoUpdate({
      target: paradas.id,
      set: {
        nome: resumo.nome,
        maquina: resumo.maquina,
        area: resumo.area,
        data: resumo.data,
        duracaoPlanejada: resumo.duracaoPlanejada,
        duracaoRealizada: resumo.duracaoRealizada,
        status: resumo.status,
        responsavel: resumo.responsavel,
        imagem: resumo.imagem,
        fotosMaquina: resumo.fotosMaquina ?? [],
        kpis: data.kpis,
        timeline: data.timeline,
        servicos: data.servicos,
        caminhoCritico: data.caminhoCritico,
        pendencias: data.pendencias,
        graficos: data.graficos,
        resultadoFinal: data.resultadoFinal,
        atualizadoEm: new Date(),
      },
    });

  return { ok: true };
}

export async function deleteParada(idBruto: string): Promise<{ ok: boolean; erro?: string }> {
  const autorizado = await ehEditor();
  if (!autorizado) return { ok: false, erro: "Não autorizado." };

  // sanearId lanca em id invalido; aqui a acao devolve {ok,erro} como as
  // outras, entao converte em vez de estourar uma excecao no cliente.
  let id: string;
  try {
    id = sanearId(idBruto);
  } catch {
    return { ok: false, erro: "Identificador inválido." };
  }

  await getDb().delete(paradas).where(eq(paradas.id, id));
  return { ok: true };
}

// Clona um relatório existente como ponto de partida para uma nova parada no
// mesmo equipamento: mantém a estrutura (serviços, timeline, caminho crítico)
// como modelo, mas zera o progresso (fotos, status, horários, pendências) e
// recalcula kpis/gráficos/resultado do zero, já que nada foi executado ainda.
export async function clonarParada(idOrigemBruto: string): Promise<{ ok: boolean; erro?: string; novoId?: string }> {
  const autorizado = await ehEditor();
  if (!autorizado) return { ok: false, erro: "Não autorizado." };

  let idOrigem: string;
  try {
    idOrigem = sanearId(idOrigemBruto);
  } catch {
    return { ok: false, erro: "Identificador inválido." };
  }

  const [row] = await getDb().select().from(paradas).where(eq(paradas.id, idOrigem)).limit(1);
  if (!row) return { ok: false, erro: "Relatório não encontrado." };

  const novoId = `${row.id}-copia-${Date.now().toString(36)}-${sufixoAleatorio()}`;
  const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());

  const servicosClonados: Servico[] = row.servicos.map((s) => ({
    ...s,
    id: crypto.randomUUID(),
    status: "pendente",
    horaInicio: "",
    horaFim: "",
    servicoExecutado: gerarDescricaoExecucao(s.problemaIdentificado, "pendente"),
    resultado: textoResultadoPadrao("pendente"),
    fotoAntes: NO_PHOTO_PLACEHOLDER,
    fotoAntesHorario: undefined,
    fotoDurante: undefined,
    fotoDuranteHorario: undefined,
    fotoDepois: NO_PHOTO_PLACEHOLDER,
    fotoDepoisHorario: undefined,
    // "Não será feito" é uma decisão sobre a execução da parada de ORIGEM,
    // não um atributo permanente do serviço — sem isso, todo clone nasceria
    // com OS já marcadas como não feitas antes de qualquer trabalho começar.
    naoFeitoCategoria: undefined,
    justificativaNaoFeito: undefined,
  }));

  const timelineClonada: TimelineEvento[] = row.timeline.map((t) => ({ ...t, id: crypto.randomUUID(), status: "pendente" }));

  const caminhoCriticoClonado: CaminhoCriticoItem[] = row.caminhoCritico.map((c) => ({
    ...c,
    id: crypto.randomUUID(),
    inicioReal: "",
    fimReal: "",
    diferencaMin: 0,
    status: "pendente",
    causaAtraso: undefined,
  }));

  const resumoClonado: ParadaResumo = {
    id: novoId,
    nome: `${row.nome} (Cópia)`,
    maquina: row.maquina,
    area: row.area,
    data: hoje,
    duracaoPlanejada: row.duracaoPlanejada,
    duracaoRealizada: "0h",
    status: "em_andamento",
    responsavel: row.responsavel,
    imagem: row.imagem,
    fotosMaquina: row.fotosMaquina ?? [],
  };

  const tetoHorasClone = parseHoras(row.duracaoPlanejada) || undefined;
  const kpisClonados = deriveKpis(servicosClonados, row.kpis.seguranca, {
    totalPlanejado: row.kpis.osPlanejadas,
    totalExecutadas: 0,
    duracaoMaximaHoras: tetoHorasClone,
  });
  const graficosClonados = deriveGraficos(
    servicosClonados,
    caminhoCriticoClonado,
    row.graficos.planejadoRealizado,
    kpisClonados.eficiencia,
    tetoHorasClone
  );
  const resultadoClonado = gerarResultadoFinal(resumoClonado, kpisClonados);

  await getDb().insert(paradas).values({
    id: novoId,
    nome: resumoClonado.nome,
    maquina: resumoClonado.maquina,
    area: resumoClonado.area,
    data: resumoClonado.data,
    duracaoPlanejada: resumoClonado.duracaoPlanejada,
    duracaoRealizada: resumoClonado.duracaoRealizada,
    status: resumoClonado.status,
    responsavel: resumoClonado.responsavel,
    imagem: resumoClonado.imagem,
    fotosMaquina: resumoClonado.fotosMaquina ?? [],
    kpis: kpisClonados,
    timeline: timelineClonada,
    servicos: servicosClonados,
    caminhoCritico: caminhoCriticoClonado,
    pendencias: [],
    graficos: graficosClonados,
    resultadoFinal: resultadoClonado,
    atualizadoEm: new Date(),
  });

  return { ok: true, novoId };
}

export interface PendenciaChecklistItem {
  paradaId: string;
  paradaNome: string;
  servicoId: string;
  numeroOS: string;
  equipamento: string;
  titulo: string;
  equipe: string;
  responsavel: string;
  faltando: string[];
  naoFeitoCategoria?: MotivoNaoFeitoCategoria;
  justificativaNaoFeito?: string;
}

// Varre todos os relatórios em busca de serviços com fotos faltando (Antes/Depois)
// ou status ainda não concluído — uma visão cruzada para saber o que falta
// documentar antes de fechar cada parada. Cruza dados de TODOS os relatórios
// de uma vez (igual ao backup completo), então exige senha de editor — antes
// a página só escondia isso na tela, mas mandava os dados pra qualquer
// visitante do jeito mesmo (o componente client só não desenhava na tela).
export async function listChecklistPendencias(): Promise<PendenciaChecklistItem[]> {
  const autorizado = await ehEditor();
  if (!autorizado) return [];

  // So id, nome e servicos entram na conta do checklist — nao ha por que
  // carregar graficos, timeline e resultado de todos os relatorios pra listar
  // o que falta fotografar.
  const rows = await getDb()
    .select({ id: paradas.id, nome: paradas.nome, servicos: paradas.servicos })
    .from(paradas)
    .orderBy(asc(paradas.data));
  const itens: PendenciaChecklistItem[] = [];

  for (const row of rows) {
    for (const s of row.servicos) {
      const faltando: string[] = [];
      if (!s.fotoAntes || s.fotoAntes === NO_PHOTO_PLACEHOLDER) faltando.push("Foto Antes");
      if (!s.fotoDepois || s.fotoDepois === NO_PHOTO_PLACEHOLDER) faltando.push("Foto Depois");
      if (s.status !== "concluido") faltando.push("Status pendente");
      if (s.naoFeitoCategoria) faltando.push("Não será feito");

      if (faltando.length > 0) {
        itens.push({
          paradaId: row.id,
          paradaNome: row.nome,
          servicoId: s.id,
          numeroOS: s.numeroOS,
          equipamento: s.equipamento,
          titulo: s.titulo,
          equipe: s.equipe,
          responsavel: s.responsavel,
          faltando,
          naoFeitoCategoria: s.naoFeitoCategoria,
          justificativaNaoFeito: s.justificativaNaoFeito,
        });
      }
    }
  }

  return itens;
}

// Varre todos os relatórios em busca de serviços marcados "não será feito",
// pra alertar (na Captura Rápida e no formulário /novo) quando a mesma OS ou
// o mesmo equipamento reaparece numa parada nova — quem está montando ou
// executando o relatório já sabe, antes de começar, que da última vez faltou
// material/tempo/recurso, e o motivo exato. Cruza dados de TODOS os
// relatórios de uma vez (igual ao checklist de pendências), então exige
// senha de editor.
export async function listHistoricoNaoFeito(): Promise<HistoricoNaoFeitoItem[]> {
  const autorizado = await ehEditor();
  if (!autorizado) return [];

  const rows = await getDb()
    .select({ id: paradas.id, nome: paradas.nome, data: paradas.data, servicos: paradas.servicos })
    .from(paradas)
    .orderBy(asc(paradas.data));

  const itens: HistoricoNaoFeitoItem[] = [];
  for (const row of rows) {
    for (const s of row.servicos) {
      if (!s.naoFeitoCategoria) continue;
      itens.push({
        paradaId: row.id,
        paradaNome: row.nome,
        paradaData: row.data,
        numeroOS: s.numeroOS,
        equipamento: s.equipamento,
        categoria: s.naoFeitoCategoria,
        justificativa: s.justificativaNaoFeito ?? "",
      });
    }
  }
  return itens;
}

export async function uploadFoto(formData: FormData): Promise<{ ok: boolean; url?: string; erro?: string }> {
  const autorizado = await ehEditor();
  if (!autorizado) return { ok: false, erro: "Não autorizado." };

  // Upload e a acao mais cara do app (rede + Blob) e a mais atraente pra abusar:
  // 40 fotos por minuto ja e mais do que qualquer equipe tira em campo.
  const limiteUpload = await consumirLimite(`upload:${await identificarRequisitante()}`, 40, 60);
  if (!limiteUpload.permitido) return { ok: false, erro: limiteExcedidoMsg() };

  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, erro: "Arquivo inválido." };
  // O bodySizeLimit de 10mb do next.config so limita o corpo inteiro da Server
  // Action; sem um teto aqui, nada impede encher o Blob (que e cobrado por GB)
  // com arquivos no limite, um atras do outro. O tamanho e conferido ANTES de
  // ler qualquer byte do arquivo, pra nao gastar memoria com o que ja esta
  // reprovado.
  const LIMITE_BYTES = 12 * 1024 * 1024;
  if (file.size > LIMITE_BYTES) return { ok: false, erro: "Imagem muito grande (máximo 12 MB)." };
  if (file.size === 0) return { ok: false, erro: "Arquivo vazio." };

  // Quem manda no tipo sao os primeiros bytes do arquivo, nao o file.type que
  // o cliente declarou — ver detectarImagem(). Sem isso, quem tem a senha de
  // editor podia hospedar HTML, SVG com script ou um executavel num blob
  // publico, rotulado como imagem.
  const imagem = await detectarImagem(file);
  if (!imagem) return { ok: false, erro: "Só é permitido enviar imagens JPEG, PNG ou WebP." };

  // file.name vem do cliente sem nenhuma garantia — nunca usa ele direto na
  // chave do blob. A extensao agora sai do formato detectado, e o resto do
  // nome e aleatorio.
  const nomeUnico = `fotos/${Date.now()}-${Math.random().toString(36).slice(2, 10)}${imagem.extensao}`;
  // contentType explicito: sem ele o Blob adota o tipo declarado pelo cliente,
  // e o arquivo voltaria a ser servido com o rotulo que o cliente escolheu —
  // desfazendo, na entrega, a checagem que acabou de ser feita na entrada.
  const blob = await put(nomeUnico, file, { access: "public", contentType: imagem.tipo });
  return { ok: true, url: blob.url };
}

function horarioAgora(): string {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Sao_Paulo" }).format(new Date());
}

type Etapa = { campo: "fotoAntes" | "fotoDurante" | "fotoDepois"; horarioCampo: "fotoAntesHorario" | "fotoDuranteHorario" | "fotoDepoisHorario"; label: string };

const ETAPA_ANTES: Etapa = { campo: "fotoAntes", horarioCampo: "fotoAntesHorario", label: "Antes" };
const ETAPA_DURANTE: Etapa = { campo: "fotoDurante", horarioCampo: "fotoDuranteHorario", label: "Durante" };
const ETAPA_DEPOIS: Etapa = { campo: "fotoDepois", horarioCampo: "fotoDepoisHorario", label: "Depois" };

// A maioria das OS só usa duas fotos (antes no computador, depois em campo pelo
// celular) — "Durante" é opcional. Por isso a busca pela próxima etapa vazia
// prioriza Depois antes de Durante: senão a foto tirada em campo cai em
// "Durante" mesmo quando a intenção era fechar o registro com "Depois".
const ORDEM_CAPTURA: Etapa[] = [ETAPA_ANTES, ETAPA_DEPOIS, ETAPA_DURANTE];

function etapaEstaVazia(servico: Servico, etapa: Etapa): boolean {
  const valor = servico[etapa.campo];
  if (etapa.campo === "fotoDurante") return !valor;
  return !valor || valor === NO_PHOTO_PLACEHOLDER;
}

// Grava a foto direto na OS certa, mexendo só no array de serviços — assim uma
// captura em campo não corre o risco de sobrescrever outras edições feitas ao
// mesmo tempo em outras partes do relatório (diferente do formulário completo,
// que reenvia o relatório inteiro a cada salvamento).
const ETAPAS_POR_LABEL: Record<"Antes" | "Durante" | "Depois", Etapa> = {
  Antes: ETAPA_ANTES,
  Durante: ETAPA_DURANTE,
  Depois: ETAPA_DEPOIS,
};

export async function capturarFotoServico(
  paradaIdBruto: string,
  servicoIdBruto: string,
  urlBruta: string,
  etapaEscolhidaBruta?: "Antes" | "Durante" | "Depois"
): Promise<{ ok: boolean; erro?: string; label?: string; horario?: string; statusFechado?: StatusItem }> {
  const autorizado = await ehEditor();
  if (!autorizado) return { ok: false, erro: "Não autorizado." };

  let paradaId: string;
  try {
    paradaId = sanearId(paradaIdBruto);
  } catch {
    return { ok: false, erro: "Identificador inválido." };
  }
  const servicoId = sanearTexto(servicoIdBruto, 80);
  // A URL da foto e escolhida pelo cliente. Sem esta checagem daria pra gravar
  // no relatorio um endereco de terceiros — e cada pessoa que abrisse a
  // apresentacao entregaria IP e horario pra esse servidor de fora.
  const url = urlDeFotoValida(urlBruta);
  if (!url) return { ok: false, erro: "URL de foto inválida." };
  const etapaEscolhida =
    etapaEscolhidaBruta === "Antes" || etapaEscolhidaBruta === "Durante" || etapaEscolhidaBruta === "Depois" ? etapaEscolhidaBruta : undefined;

  const [row] = await getDb().select().from(paradas).where(eq(paradas.id, paradaId)).limit(1);
  if (!row) return { ok: false, erro: "Relatório não encontrado." };

  const idx = row.servicos.findIndex((s) => s.id === servicoId);
  if (idx === -1) return { ok: false, erro: "Serviço não encontrado." };

  const servico = row.servicos[idx];
  // Se o usuário escolheu a etapa manualmente (Antes/Durante/Depois), usa essa
  // direto — só cai na detecção automática quando nada foi escolhido.
  const etapaVazia = etapaEscolhida ? ETAPAS_POR_LABEL[etapaEscolhida] : (ORDEM_CAPTURA.find((e) => etapaEstaVazia(servico, e)) ?? ETAPA_DEPOIS);

  const horario = horarioAgora();
  let servicoAtualizado: Servico = { ...servico, [etapaVazia.campo]: url, [etapaVazia.horarioCampo]: horario };

  // Antes e Depois são as duas fotos que realmente fecham o registro (Durante
  // é opcional) — assim que as duas existem, a OS conclui sozinha, sem
  // precisar voltar depois só pra tocar em "Concluído" pelo celular.
  const temAntes = !!servicoAtualizado.fotoAntes && servicoAtualizado.fotoAntes !== NO_PHOTO_PLACEHOLDER;
  const temDepois = !!servicoAtualizado.fotoDepois && servicoAtualizado.fotoDepois !== NO_PHOTO_PLACEHOLDER;
  const fechaAutomaticamente = temAntes && temDepois && servicoAtualizado.status !== "concluido";
  if (fechaAutomaticamente) {
    servicoAtualizado = {
      ...servicoAtualizado,
      status: "concluido",
      servicoExecutado: gerarDescricaoExecucao(servicoAtualizado.problemaIdentificado, "concluido"),
      resultado: textoResultadoPadrao("concluido"),
    };
  }

  const servicosAtualizados = [...row.servicos];
  servicosAtualizados[idx] = servicoAtualizado;

  if (!fechaAutomaticamente) {
    await getDb().update(paradas).set({ servicos: servicosAtualizados, atualizadoEm: new Date() }).where(eq(paradas.id, paradaId));
    return { ok: true, label: etapaVazia.label, horario };
  }

  // Fechar sozinho muda a contagem de concluídas — recalcula kpis/gráficos na
  // hora, igual marcarStatusServico já faz pra mudança manual de status.
  const tetoHoras = parseHoras(row.duracaoRealizada) || parseHoras(row.duracaoPlanejada) || undefined;
  const kpisAtualizados = deriveKpis(servicosAtualizados, row.kpis.seguranca, { totalPlanejado: row.kpis.osPlanejadas, duracaoMaximaHoras: tetoHoras });
  const atrasoGeralHoras = Math.max(0, parseHoras(row.duracaoRealizada) - parseHoras(row.duracaoPlanejada));
  const graficosAtualizados = deriveGraficos(
    servicosAtualizados,
    row.caminhoCritico,
    row.graficos.planejadoRealizado,
    kpisAtualizados.eficiencia,
    tetoHoras,
    atrasoGeralHoras
  );
  const resultadoAtualizado = { ...row.resultadoFinal, eficiencia: kpisAtualizados.eficiencia, pendenciasAbertas: kpisAtualizados.pendencias };

  await getDb()
    .update(paradas)
    .set({ servicos: servicosAtualizados, kpis: kpisAtualizados, graficos: graficosAtualizados, resultadoFinal: resultadoAtualizado, atualizadoEm: new Date() })
    .where(eq(paradas.id, paradaId));

  return { ok: true, label: etapaVazia.label, horario, statusFechado: "concluido" };
}

// Serviços importados de planilha entram como "pendente" e podem ser marcados
// concluídos direto do celular, mesmo sem foto — mexe só no campo status, com
// o mesmo cuidado de update pontual das outras ações de captura em campo.
export async function marcarStatusServico(
  paradaIdBruto: string,
  servicoIdBruto: string,
  statusBruto: StatusItem
): Promise<{ ok: boolean; erro?: string }> {
  const autorizado = await ehEditor();
  if (!autorizado) return { ok: false, erro: "Não autorizado." };

  let paradaId: string;
  try {
    paradaId = sanearId(paradaIdBruto);
  } catch {
    return { ok: false, erro: "Identificador inválido." };
  }
  const servicoId = sanearTexto(servicoIdBruto, 80);
  let status: StatusItem;
  try {
    status = sanearStatusItem(statusBruto);
  } catch {
    return { ok: false, erro: "Status inválido." };
  }

  const [row] = await getDb().select().from(paradas).where(eq(paradas.id, paradaId)).limit(1);
  if (!row) return { ok: false, erro: "Relatório não encontrado." };

  const idx = row.servicos.findIndex((s) => s.id === servicoId);
  if (idx === -1) return { ok: false, erro: "Serviço não encontrado." };

  const servico = row.servicos[idx];
  const servicoAtualizado: Servico = {
    ...servico,
    status,
    servicoExecutado: gerarDescricaoExecucao(servico.problemaIdentificado, status),
    resultado: textoResultadoPadrao(status),
  };
  const servicosAtualizados = [...row.servicos];
  servicosAtualizados[idx] = servicoAtualizado;

  // Marcar concluído/pendente pelo celular precisa refletir na eficiência na
  // hora — por isso, diferente de capturarFotoServico (que não muda status),
  // aqui os KPIs são recalculados a partir da contagem real de status, não
  // do número "OS Executadas" digitado manualmente (que fica desatualizado
  // assim que o trabalho passa a ser marcado em campo).
  const tetoHoras = parseHoras(row.duracaoRealizada) || parseHoras(row.duracaoPlanejada) || undefined;
  const kpisAtualizados = deriveKpis(servicosAtualizados, row.kpis.seguranca, { totalPlanejado: row.kpis.osPlanejadas, duracaoMaximaHoras: tetoHoras });
  const atrasoGeralHoras = Math.max(0, parseHoras(row.duracaoRealizada) - parseHoras(row.duracaoPlanejada));
  const graficosAtualizados = deriveGraficos(
    servicosAtualizados,
    row.caminhoCritico,
    row.graficos.planejadoRealizado,
    kpisAtualizados.eficiencia,
    tetoHoras,
    atrasoGeralHoras
  );
  const resultadoAtualizado = { ...row.resultadoFinal, eficiencia: kpisAtualizados.eficiencia, pendenciasAbertas: kpisAtualizados.pendencias };

  await getDb()
    .update(paradas)
    .set({ servicos: servicosAtualizados, kpis: kpisAtualizados, graficos: graficosAtualizados, resultadoFinal: resultadoAtualizado, atualizadoEm: new Date() })
    .where(eq(paradas.id, paradaId));

  return { ok: true };
}

// Marca (ou desmarca) um serviço como "não será feito", com uma categoria
// fechada — Falta de Material, Falta de Tempo etc — e um detalhe opcional
// em texto livre. A categoria É o sinal de "está marcado": categoria vazia
// apaga os dois campos (desmarcar o quadradinho). Não mexe no status nem nos
// KPIs — só aparece pro editor no checklist de pendências e no alerta de
// histórico entre relatórios.
export async function definirNaoFeito(
  paradaIdBruto: string,
  servicoIdBruto: string,
  categoriaBruta: string,
  justificativaBruta: string
): Promise<{ ok: boolean; erro?: string }> {
  const autorizado = await ehEditor();
  if (!autorizado) return { ok: false, erro: "Não autorizado." };

  let paradaId: string;
  try {
    paradaId = sanearId(paradaIdBruto);
  } catch {
    return { ok: false, erro: "Identificador inválido." };
  }
  const servicoId = sanearTexto(servicoIdBruto, 80);
  const categoria = sanearMotivoNaoFeito(categoriaBruta);
  const justificativa = sanearTexto(justificativaBruta, 5000);

  const [row] = await getDb().select().from(paradas).where(eq(paradas.id, paradaId)).limit(1);
  if (!row) return { ok: false, erro: "Relatório não encontrado." };

  const idx = row.servicos.findIndex((s) => s.id === servicoId);
  if (idx === -1) return { ok: false, erro: "Serviço não encontrado." };

  const servicosAtualizados = [...row.servicos];
  servicosAtualizados[idx] = {
    ...servicosAtualizados[idx],
    naoFeitoCategoria: categoria || undefined,
    justificativaNaoFeito: justificativa || undefined,
  };

  await getDb().update(paradas).set({ servicos: servicosAtualizados, atualizadoEm: new Date() }).where(eq(paradas.id, paradaId));

  return { ok: true };
}

interface NovaOsInput {
  numeroOS: string;
  equipamento: string;
  area: string;
  responsavel: string;
  equipe: Equipe;
  categoria: string;
  motivo: string;
}

// Abre uma OS nova direto pelo celular (Captura Rápida), sem passar pelo
// formulário completo. Recalcula kpis/gráficos a partir do array atualizado
// de serviços, mas só grava as colunas servicos/kpis/graficos — o resto do
// relatório (capa, linha do tempo, pendências etc.) fica intocado.
export async function adicionarServicoRapido(paradaIdBruto: string, inputBruto: NovaOsInput): Promise<{ ok: boolean; erro?: string; servico?: Servico }> {
  const autorizado = await ehEditor();
  if (!autorizado) return { ok: false, erro: "Não autorizado." };

  let paradaId: string;
  try {
    paradaId = sanearId(paradaIdBruto);
  } catch {
    return { ok: false, erro: "Identificador inválido." };
  }
  // Reconstroi o input em vez de confiar no objeto recebido: campo extra que
  // venha junto simplesmente nao existe daqui pra frente.
  const input = {
    numeroOS: sanearTexto(inputBruto?.numeroOS, 80),
    equipamento: sanearTexto(inputBruto?.equipamento, 200),
    area: sanearTexto(inputBruto?.area, 200),
    responsavel: sanearTexto(inputBruto?.responsavel, 200),
    equipe: sanearEquipe(inputBruto?.equipe),
    categoria: sanearTexto(inputBruto?.categoria, 200),
    motivo: sanearTexto(inputBruto?.motivo, 5000),
  };

  const equipamento = input.equipamento.trim();
  if (!equipamento) return { ok: false, erro: "Informe o equipamento." };

  const [row] = await getDb().select().from(paradas).where(eq(paradas.id, paradaId)).limit(1);
  if (!row) return { ok: false, erro: "Relatório não encontrado." };

  const problemaIdentificado = input.motivo.trim() || "Necessidade identificada durante a parada.";
  const novoServico: Servico = {
    id: crypto.randomUUID(),
    numeroOS: input.numeroOS.trim() || "Oportunidade",
    titulo: `Manutenção em ${equipamento}`,
    equipamento,
    area: input.area.trim() || row.maquina,
    responsavel: input.responsavel.trim() || row.responsavel,
    equipe: input.equipe,
    categoria: input.categoria,
    horaInicio: "",
    horaFim: "",
    tempoGasto: "1h",
    problemaIdentificado,
    servicoExecutado: gerarDescricaoExecucao(problemaIdentificado, "concluido"),
    resultado: textoResultadoPadrao("concluido"),
    status: "concluido",
    fotoAntes: NO_PHOTO_PLACEHOLDER,
    fotoDepois: NO_PHOTO_PLACEHOLDER,
  };

  const servicosAtualizados = [...row.servicos, novoServico];
  const tetoHoras = parseHoras(row.duracaoRealizada) || parseHoras(row.duracaoPlanejada) || undefined;
  // OS Executadas é um número informado manualmente (não conta mais os serviços
  // detalhados um a um, já que só os "principais" com foto ganham entrada aqui) —
  // como essa OS nova nasce concluída, soma 1 ao total já registrado.
  const kpisAtualizados = deriveKpis(servicosAtualizados, row.kpis.seguranca, {
    totalPlanejado: row.kpis.osPlanejadas,
    totalExecutadas: row.kpis.osConcluidas + 1,
    duracaoMaximaHoras: tetoHoras,
  });
  const atrasoGeralHoras = Math.max(0, parseHoras(row.duracaoRealizada) - parseHoras(row.duracaoPlanejada));
  const graficosAtualizados = deriveGraficos(
    servicosAtualizados,
    row.caminhoCritico,
    row.graficos.planejadoRealizado,
    kpisAtualizados.eficiencia,
    tetoHoras,
    atrasoGeralHoras
  );
  const resultadoAtualizado = { ...row.resultadoFinal, eficiencia: kpisAtualizados.eficiencia, pendenciasAbertas: kpisAtualizados.pendencias };

  await getDb()
    .update(paradas)
    .set({ servicos: servicosAtualizados, kpis: kpisAtualizados, graficos: graficosAtualizados, resultadoFinal: resultadoAtualizado, atualizadoEm: new Date() })
    .where(eq(paradas.id, paradaId));

  return { ok: true, servico: novoServico };
}

interface NovoEventoInput {
  titulo: string;
  responsavel: string;
  descricao: string;
  icone: TimelineEvento["icone"];
}

// Marca um evento da linha do tempo (bloqueio, liberação, partida...) direto
// do celular, com horário automático — sem isso, só dava pra registrar esses
// marcos depois, no formulário do computador, longe do momento real.
export async function adicionarEventoRapido(paradaIdBruto: string, inputBruto: NovoEventoInput): Promise<{ ok: boolean; erro?: string; evento?: TimelineEvento }> {
  const autorizado = await ehEditor();
  if (!autorizado) return { ok: false, erro: "Não autorizado." };

  let paradaId: string;
  try {
    paradaId = sanearId(paradaIdBruto);
  } catch {
    return { ok: false, erro: "Identificador inválido." };
  }
  const input = {
    titulo: sanearTexto(inputBruto?.titulo, 200),
    responsavel: sanearTexto(inputBruto?.responsavel, 200),
    descricao: sanearTexto(inputBruto?.descricao, 5000),
    icone: sanearIcone(inputBruto?.icone),
  };

  const titulo = input.titulo.trim();
  if (!titulo) return { ok: false, erro: "Informe o evento." };

  const [row] = await getDb().select({ timeline: paradas.timeline }).from(paradas).where(eq(paradas.id, paradaId)).limit(1);
  if (!row) return { ok: false, erro: "Relatório não encontrado." };

  const novoEvento: TimelineEvento = {
    id: crypto.randomUUID(),
    horario: horarioAgora(),
    titulo,
    responsavel: input.responsavel.trim() || "—",
    descricao: input.descricao.trim(),
    icone: input.icone,
    status: "concluido",
  };

  const timelineAtualizada = [...row.timeline, novoEvento];
  await getDb().update(paradas).set({ timeline: timelineAtualizada, atualizadoEm: new Date() }).where(eq(paradas.id, paradaId));

  return { ok: true, evento: novoEvento };
}

export async function excluirFoto(urlBruta: string): Promise<void> {
  const autorizado = await ehEditor();
  if (!autorizado) return;

  // A checagem anterior era url.includes("blob.vercel-storage.com") — uma
  // busca por trecho, que "https://exemplo.com/?x=blob.vercel-storage.com"
  // satisfaz sem ser um blob nosso. urlDeFotoValida compara o HOSTNAME da URL
  // ja interpretada, entao so passa o que realmente esta no nosso Blob.
  const url = urlDeFotoValida(urlBruta);
  if (!url) return;

  try {
    await del(url);
  } catch {
    // melhor esforço — não bloquear o usuário se a foto já não existir
  }
}
