// Lógica pura das mutações pontuais de lib/actions/paradas.ts — recebe a
// leitura mais recente do relatório (ParadaRow) e o que o usuário pediu, e
// devolve só os campos a gravar. Não toca no banco.
//
// Extraído para cá por dois motivos:
// 1. lib/actions/paradas.ts tem "use server" no topo — toda função exportada
//    de um arquivo assim vira Server Action, e precisa ser assíncrona. Estas
//    funções são propositalmente síncronas e puras, pra poderem ser chamadas
//    de novo a cada tentativa de lib/db/paradas-repo.ts (escreverComVersao)
//    sem depender de I/O.
// 2. Lógica pura é testável direto, sem simular banco nenhum — é o que os
//    testes de captura de foto, mudança de status e "não será feito" usam.

import type { ParadaRow } from "@/lib/db/schema";
import { deriveGraficos, deriveKpis, gerarDescricaoExecucao, parseHoras, textoResultadoPadrao } from "@/lib/derive";
import { NO_PHOTO_PLACEHOLDER } from "@/lib/image-utils";
import type { Equipe, MotivoNaoFeitoCategoria, Servico, StatusItem, TimelineEvento } from "@/lib/types";
import { pareceNomeDePessoa } from "@/lib/utils";
import type { ResultadoAplicar } from "@/lib/db/paradas-repo";

function horarioAgora(): string {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Sao_Paulo" }).format(new Date());
}

// -----------------------------------------------------------------------
// Captura de foto
// -----------------------------------------------------------------------

type Etapa = { campo: "fotoAntes" | "fotoDurante" | "fotoDepois"; horarioCampo: "fotoAntesHorario" | "fotoDuranteHorario" | "fotoDepoisHorario"; label: string };

const ETAPA_ANTES: Etapa = { campo: "fotoAntes", horarioCampo: "fotoAntesHorario", label: "Antes" };
const ETAPA_DURANTE: Etapa = { campo: "fotoDurante", horarioCampo: "fotoDuranteHorario", label: "Durante" };
const ETAPA_DEPOIS: Etapa = { campo: "fotoDepois", horarioCampo: "fotoDepoisHorario", label: "Depois" };

// A maioria das OS só usa duas fotos (antes no computador, depois em campo
// pelo celular) — "Durante" é opcional. Por isso a busca pela próxima etapa
// vazia prioriza Depois antes de Durante: senão a foto tirada em campo cai em
// "Durante" mesmo quando a intenção era fechar o registro com "Depois".
const ORDEM_CAPTURA: Etapa[] = [ETAPA_ANTES, ETAPA_DEPOIS, ETAPA_DURANTE];

const ETAPAS_POR_LABEL: Record<"Antes" | "Durante" | "Depois", Etapa> = {
  Antes: ETAPA_ANTES,
  Durante: ETAPA_DURANTE,
  Depois: ETAPA_DEPOIS,
};

function etapaEstaVazia(servico: Servico, etapa: Etapa): boolean {
  const valor = servico[etapa.campo];
  if (etapa.campo === "fotoDurante") return !valor;
  return !valor || valor === NO_PHOTO_PLACEHOLDER;
}

export interface CapturaFotoInput {
  servicoId: string;
  url: string;
  etapaEscolhida?: "Antes" | "Durante" | "Depois";
}

export interface CapturaFotoExtra {
  label: string;
  horario: string;
  statusFechado?: StatusItem;
}

export function aplicarCapturaFoto(row: ParadaRow, input: CapturaFotoInput): ResultadoAplicar<CapturaFotoExtra> {
  const idx = row.servicos.findIndex((s) => s.id === input.servicoId);
  if (idx === -1) return { erro: "Serviço não encontrado." };

  const servico = row.servicos[idx];
  // Se o usuário escolheu a etapa manualmente (Antes/Durante/Depois), usa essa
  // direto — só cai na detecção automática quando nada foi escolhido.
  const etapaVazia = input.etapaEscolhida ? ETAPAS_POR_LABEL[input.etapaEscolhida] : (ORDEM_CAPTURA.find((e) => etapaEstaVazia(servico, e)) ?? ETAPA_DEPOIS);

  const horario = horarioAgora();
  let servicoAtualizado: Servico = { ...servico, [etapaVazia.campo]: input.url, [etapaVazia.horarioCampo]: horario };

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
    return { valores: { servicos: servicosAtualizados }, extra: { label: etapaVazia.label, horario } };
  }

  // Fechar sozinho muda a contagem de concluídas — recalcula kpis/gráficos na
  // hora, igual aplicarMarcarStatus já faz pra mudança manual de status.
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

  return {
    valores: { servicos: servicosAtualizados, kpis: kpisAtualizados, graficos: graficosAtualizados, resultadoFinal: resultadoAtualizado },
    extra: { label: etapaVazia.label, horario, statusFechado: "concluido" },
  };
}

// -----------------------------------------------------------------------
// Mudança de status
// -----------------------------------------------------------------------

export interface MarcarStatusInput {
  servicoId: string;
  status: StatusItem;
}

export function aplicarMarcarStatus(row: ParadaRow, input: MarcarStatusInput): ResultadoAplicar<undefined> {
  const idx = row.servicos.findIndex((s) => s.id === input.servicoId);
  if (idx === -1) return { erro: "Serviço não encontrado." };

  const servico = row.servicos[idx];
  const servicoAtualizado: Servico = {
    ...servico,
    status: input.status,
    servicoExecutado: gerarDescricaoExecucao(servico.problemaIdentificado, input.status),
    resultado: textoResultadoPadrao(input.status),
  };
  const servicosAtualizados = [...row.servicos];
  servicosAtualizados[idx] = servicoAtualizado;

  // Marcar concluído/pendente pelo celular precisa refletir na eficiência na
  // hora — por isso, diferente da captura de foto (que só recalcula ao
  // fechar sozinha), aqui os KPIs são sempre recalculados a partir da
  // contagem real de status.
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

  return { valores: { servicos: servicosAtualizados, kpis: kpisAtualizados, graficos: graficosAtualizados, resultadoFinal: resultadoAtualizado } };
}

// -----------------------------------------------------------------------
// "Não será feito"
// -----------------------------------------------------------------------

export interface NaoFeitoInput {
  servicoId: string;
  categoria: MotivoNaoFeitoCategoria | "";
  justificativa: string;
}

export interface NaoFeitoExtra {
  fotosRemovidas: boolean;
  urlsParaApagar: string[];
}

export function aplicarNaoFeito(row: ParadaRow, input: NaoFeitoInput): ResultadoAplicar<NaoFeitoExtra> {
  const idx = row.servicos.findIndex((s) => s.id === input.servicoId);
  if (idx === -1) return { erro: "Serviço não encontrado." };

  const servico = row.servicos[idx];
  const atualizado: Servico = { ...servico, naoFeitoCategoria: input.categoria || undefined, justificativaNaoFeito: input.justificativa || undefined };

  // Marcar "não será feito" com foto já tirada não faz sentido — a OS não vai
  // acontecer, então as fotos que já tinha somem do relatório (viram o
  // placeholder de novo). As urls voltam pra quem chamou apagar do Blob DEPOIS
  // que a gravação no banco tiver sucesso — apagar arquivo é efeito colateral
  // de I/O, não pertence a uma função pura, e só deve rodar uma vez (na
  // tentativa que realmente venceu a escrita), não a cada nova tentativa.
  let fotosRemovidas = false;
  const urlsParaApagar: string[] = [];
  if (input.categoria) {
    const urls = [servico.fotoAntes, servico.fotoDurante, servico.fotoDepois].filter((u): u is string => !!u && u !== NO_PHOTO_PLACEHOLDER);
    if (urls.length > 0) {
      fotosRemovidas = true;
      urlsParaApagar.push(...urls);
      atualizado.fotoAntes = NO_PHOTO_PLACEHOLDER;
      atualizado.fotoAntesHorario = undefined;
      atualizado.fotoDurante = undefined;
      atualizado.fotoDuranteHorario = undefined;
      atualizado.fotoDepois = NO_PHOTO_PLACEHOLDER;
      atualizado.fotoDepoisHorario = undefined;
    }
  }

  const servicosAtualizados = [...row.servicos];
  servicosAtualizados[idx] = atualizado;

  return { valores: { servicos: servicosAtualizados }, extra: { fotosRemovidas, urlsParaApagar } };
}

// -----------------------------------------------------------------------
// Nova OS rápida
// -----------------------------------------------------------------------

export interface NovoServicoRapidoInput {
  numeroOS: string;
  equipamento: string;
  area: string;
  responsavel: string;
  equipe: Equipe;
  categoria: string;
  motivo: string;
}

export function aplicarNovoServicoRapido(row: ParadaRow, input: NovoServicoRapidoInput): ResultadoAplicar<{ servico: Servico }> {
  const equipamento = input.equipamento.trim();
  if (!equipamento) return { erro: "Informe o equipamento." };

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
  // OS Executadas é um número informado manualmente (não conta mais os
  // serviços detalhados um a um) — como essa OS nova nasce concluída, soma 1
  // ao total já registrado NESTA leitura (por isso precisa vir de `row`, não
  // de um valor capturado antes do loop de tentativas).
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

  return {
    valores: { servicos: servicosAtualizados, kpis: kpisAtualizados, graficos: graficosAtualizados, resultadoFinal: resultadoAtualizado },
    extra: { servico: novoServico },
  };
}

// -----------------------------------------------------------------------
// Novo evento rápido (timeline)
// -----------------------------------------------------------------------

export interface NovoEventoRapidoInput {
  titulo: string;
  responsavel: string;
  descricao: string;
  icone: TimelineEvento["icone"];
}

export function aplicarNovoEventoRapido(row: ParadaRow, input: NovoEventoRapidoInput): ResultadoAplicar<{ evento: TimelineEvento }> {
  const titulo = input.titulo.trim();
  if (!titulo) return { erro: "Informe o evento." };

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
  return { valores: { timeline: timelineAtualizada }, extra: { evento: novoEvento } };
}

// -----------------------------------------------------------------------
// Responsáveis conhecidos (autocomplete)
// -----------------------------------------------------------------------

// Junta os nomes já usados como responsável (da parada ou de algum serviço
// dela) em todos os relatórios — usado só pra sugerir no autocomplete do
// campo "Responsável", nunca pra restringir o que pode ser digitado.
// pareceNomeDePessoa descarta lixo (número de turno, célula com erro de
// acentuação) que às vezes aparece nesse campo vindo da planilha importada.
export function coletarResponsaveisConhecidos(rows: Array<{ responsavel: string; servicos: Array<Pick<Servico, "responsavel">> }>): string[] {
  const nomes = new Set<string>();
  for (const row of rows) {
    if (pareceNomeDePessoa(row.responsavel)) nomes.add(row.responsavel.trim());
    for (const s of row.servicos) {
      if (pareceNomeDePessoa(s.responsavel)) nomes.add(s.responsavel.trim());
    }
  }
  return Array.from(nomes).sort((a, b) => a.localeCompare(b, "pt-BR"));
}
