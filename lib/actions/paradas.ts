"use server";

import { del, put } from "@vercel/blob";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { sufixoAleatorio } from "@/lib/utils";
import { paradas } from "@/lib/db/schema";
import type { CaminhoCriticoItem, Equipe, Kpis, MotivoNaoFeitoCategoria, ParadaCompleta, ParadaResumo, Servico, StatusItem, TimelineEvento } from "@/lib/types";
import type { HistoricoNaoFeitoItem } from "@/lib/historico-nao-feito";
import { calcularPorEquipe, deriveFotoCapa, deriveFotos, deriveGraficos, deriveKpis, gerarDescricaoExecucao, parseHoras, textoResultadoPadrao } from "@/lib/derive";
import type { EquipePorParada } from "@/lib/derive";
import { gerarResultadoFinal } from "@/lib/mock-data";
import { NO_PHOTO_PLACEHOLDER } from "@/lib/image-utils";
import { ehEditor } from "@/lib/auth/session";
import { consumirLimite, identificarRequisitante, limiteExcedidoMsg } from "@/lib/rate-limit";
import { registrarAuditoria } from "@/lib/auditoria";
import { escreverComVersao, upsertComVersao } from "@/lib/db/paradas-repo";
import {
  aplicarCapturaFoto,
  aplicarMarcarStatus,
  aplicarNaoFeito,
  aplicarNovoEventoRapido,
  aplicarNovoServicoRapido,
  coletarResponsaveisConhecidos,
} from "@/lib/actions/paradas-logic";
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

// Nomes já usados como responsável (da parada ou de algum serviço dela), pra
// sugerir no autocomplete de "Responsável" sem transformar o campo em
// cadastro — quem digita continua podendo escrever qualquer nome novo, isto
// aqui só ajuda a não redigitar um nome que já apareceu antes. Leitura
// pública porque "responsavel" já aparece na apresentação de qualquer
// relatório publicado — não é informação nova sendo exposta.
export async function listResponsaveisConhecidos(): Promise<string[]> {
  const rows = await getDb().select({ responsavel: paradas.responsavel, servicos: paradas.servicos }).from(paradas);
  return coletarResponsaveisConhecidos(rows);
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
  porEquipe: EquipePorParada[];
}

// Uma linha por relatório com só o que a página de Histórico precisa —
// evita carregar fotos/graficos inteiros de cada parada só pra comparar
// KPIs entre elas. "servicos" já vem dentro de COLUNAS_RESUMO (rowParaResumo
// precisa dele pra foto de capa), então calcular a quebra por equipe aqui
// não custa nenhuma consulta a mais — só processa o que já chegou.
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
  return rows.map((row) => ({ resumo: rowParaResumo(row), kpis: row.kpis, porEquipe: calcularPorEquipe(row.servicos) }));
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

// Igual a getParadaCompleta, mas devolve também a versão (atualizadoEm) da
// MESMA leitura, numa única consulta — usado por /novo ao entrar em modo de
// edição.
//
// Bloco F: antes disto, o formulário chamava getParadaCompleta() e, em
// seguida, uma segunda função separada só pra pegar atualizadoEm. As duas
// leituras não são atômicas: se uma escrita concorrente (ex: uma captura de
// foto pela Captura Rápida) acontecesse bem no intervalo entre elas, a
// segunda leitura trazia a versão NOVA enquanto os dados do formulário
// (carregados na primeira leitura) continuavam sendo os ANTIGOS — e o
// controle de conflito em saveParada() comparava a versão nova contra o
// banco, via, e deixava passar, apagando silenciosamente a mudança feita no
// meio do caminho. Uma consulta só fecha essa janela: dado e versão sempre
// vêm do mesmo instante.
export async function getParadaCompletaComVersao(idBruto: string): Promise<{ parada: ParadaCompleta; atualizadoEm: number } | null> {
  const id = idSeguro(idBruto);
  if (!id) return null;

  const [row] = await getDb().select().from(paradas).where(eq(paradas.id, id)).limit(1);
  return row ? { parada: rowParaCompleta(row), atualizadoEm: row.atualizadoEm.getTime() } : null;
}

// atualizadoEmEsperado (epoch ms) vem do relatório que o formulário /novo
// carregou pra editar — undefined/ausente significa "relatório novo, sem
// versão anterior pra conferir". Quando presente e divergir do que está no
// banco agora, é sinal de que alguém mexeu no relatório (ex: uma captura de
// foto em campo) enquanto o formulário estava aberto: a gravação é recusada
// em vez de sobrescrever silenciosamente o que essa outra ação salvou. Ver
// lib/db/paradas-repo.ts (upsertComVersao) para o mecanismo.
export async function saveParada(dataBruta: unknown, atualizadoEmEsperado?: number): Promise<{ ok: boolean; erro?: string; conflito?: boolean }> {
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
  const versaoEsperada = typeof atualizadoEmEsperado === "number" && Number.isFinite(atualizadoEmEsperado) ? new Date(atualizadoEmEsperado) : null;

  const sucesso = await upsertComVersao(
    {
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
    },
    versaoEsperada
  );

  if (!sucesso) {
    // Bloco F: antes, um conflito de versão não deixava rastro nenhum no
    // log — só o erro genérico voltava pro navegador de quem editava. Sem
    // isto não havia como depois descobrir, a partir do log, que um
    // conflito real aconteceu (quantas vezes, em qual relatório).
    await registrarAuditoria({ acao: "conflito_salvar_relatorio", paradaId: resumo.id, origem: await identificarRequisitante() });
    return {
      ok: false,
      conflito: true,
      erro: "Este relatório foi alterado por outra ação (provavelmente pela Captura Rápida) enquanto você editava. Recarregue a página para ver as mudanças mais recentes antes de salvar de novo.",
    };
  }

  await registrarAuditoria({ acao: "salvar_relatorio", paradaId: resumo.id, origem: await identificarRequisitante() });
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
  await registrarAuditoria({ acao: "excluir_relatorio", paradaId: id, origem: await identificarRequisitante() });
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
  const resultadoClonado = gerarResultadoFinal(resumoClonado, kpisClonados, graficosClonados);

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

  await registrarAuditoria({ acao: "clonar_relatorio", paradaId: novoId, origem: await identificarRequisitante(), detalhe: { idOrigem } });
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

// Grava a foto direto na OS certa, mexendo só no array de serviços — assim uma
// captura em campo não corre o risco de sobrescrever outras edições feitas ao
// mesmo tempo em outras partes do relatório (diferente do formulário completo,
// que reenvia o relatório inteiro a cada salvamento). escreverComVersao (ver
// lib/db/paradas-repo.ts) garante isso mesmo quando DUAS capturas acontecem ao
// mesmo tempo no mesmo relatório: relê e tenta de novo em vez de perder uma
// das duas.
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

  const resultado = await escreverComVersao(paradaId, (row) => aplicarCapturaFoto(row, { servicoId, url, etapaEscolhida }));
  if (!resultado.ok) return { ok: false, erro: resultado.erro };
  await registrarAuditoria({ acao: "captura_foto", paradaId, servicoId, origem: await identificarRequisitante(), detalhe: { etapa: resultado.extra.label } });
  return { ok: true, ...resultado.extra };
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

  const resultado = await escreverComVersao(paradaId, (row) => aplicarMarcarStatus(row, { servicoId, status }));
  if (!resultado.ok) return { ok: false, erro: resultado.erro };
  await registrarAuditoria({ acao: "mudanca_status", paradaId, servicoId, origem: await identificarRequisitante(), detalhe: { status } });
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
): Promise<{ ok: boolean; erro?: string; fotosRemovidas?: boolean }> {
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

  const resultado = await escreverComVersao(paradaId, (row) => aplicarNaoFeito(row, { servicoId, categoria, justificativa }));
  if (!resultado.ok) return { ok: false, erro: resultado.erro };

  // Apaga do Blob de verdade (não só desanexa), senão fica imagem órfã
  // pagando armazenamento sem nenhum serviço apontando pra ela. Roda só
  // depois da gravação ter sucesso, e só uma vez — nas urls da tentativa que
  // realmente venceu a escrita (ver aplicarNaoFeito em paradas-logic.ts).
  // Melhor esforço — mesma lógica de excluirFoto: não é isso que decide se a
  // marcação deu certo.
  if (resultado.extra.urlsParaApagar.length > 0) {
    await Promise.all(resultado.extra.urlsParaApagar.map((url) => del(url).catch(() => {})));
  }

  await registrarAuditoria({ acao: "nao_sera_feito", paradaId, servicoId, origem: await identificarRequisitante(), detalhe: { categoria: categoria || null } });
  return { ok: true, fotosRemovidas: resultado.extra.fotosRemovidas };
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

  const resultado = await escreverComVersao(paradaId, (row) => aplicarNovoServicoRapido(row, input));
  if (!resultado.ok) return { ok: false, erro: resultado.erro };
  await registrarAuditoria({ acao: "nova_os_rapida", paradaId, servicoId: resultado.extra.servico.id, origem: await identificarRequisitante() });
  return { ok: true, servico: resultado.extra.servico };
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

  const resultado = await escreverComVersao(paradaId, (row) => aplicarNovoEventoRapido(row, input));
  if (!resultado.ok) return { ok: false, erro: resultado.erro };
  await registrarAuditoria({ acao: "novo_evento_rapido", paradaId, origem: await identificarRequisitante(), detalhe: { titulo: resultado.extra.evento.titulo } });
  return { ok: true, evento: resultado.extra.evento };
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
