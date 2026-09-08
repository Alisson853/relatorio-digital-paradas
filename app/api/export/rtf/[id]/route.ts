import { NextRequest } from "next/server";
import sharp from "sharp";
import imageSize from "image-size";
import { getParadaCompleta } from "@/lib/actions/paradas";
import { ehEditor } from "@/lib/auth/session";
import { sanearId } from "@/lib/validation";
import { servicosComFoto } from "@/lib/derive";
import { NO_PHOTO_PLACEHOLDER } from "@/lib/image-utils";
import { gerarQrCodeBuffer, urlDaParada } from "@/lib/qrcode";
import { formatDate, statusLabel } from "@/lib/utils";
import type { ParadaCompleta } from "@/lib/types";

export const dynamic = "force-dynamic";

// RTF puro, feito pra colar direto num campo de texto de sistema de manutenção
// (Mantec e afins). Fotos vêm embutidas como \pict — redimensionadas e
// recomprimidas antes, senão o arquivo fica gigante e é o que costuma travar
// esse tipo de importação em sistema legado.

const PAGE_WIDTH_TWIPS = 9026; // A4, margem de 1" de cada lado
const FOTO_LARGURA_PX = 320;

async function fetchImagemRtf(url: string, origin: string): Promise<{ hex: string; width: number; height: number } | null> {
  try {
    const absoluta = url.startsWith("http") ? url : new URL(url, origin).toString();
    const res = await fetch(absoluta);
    if (!res.ok) return null;
    const original = Buffer.from(await res.arrayBuffer());
    const redimensionada = await sharp(original).resize({ width: FOTO_LARGURA_PX, withoutEnlargement: true }).jpeg({ quality: 60 }).toBuffer();
    const dims = imageSize(redimensionada);
    if (!dims.width || !dims.height) return null;
    return { hex: redimensionada.toString("hex"), width: dims.width, height: dims.height };
  } catch {
    return null;
  }
}

// Quebra o hex em linhas — evita uma única linha gigantesca, que alguns
// leitores de RTF truncam ou travam ao processar.
function pictBlock(foto: { hex: string; width: number; height: number }): string {
  const goalW = Math.round(foto.width * 15); // ~96dpi -> twips
  const goalH = Math.round(foto.height * 15);
  const linhasHex: string[] = [];
  for (let i = 0; i < foto.hex.length; i += 128) linhasHex.push(foto.hex.slice(i, i + 128));
  return `{\\pict\\jpegblip\\picw${foto.width}\\pich${foto.height}\\picwgoal${goalW}\\pichgoal${goalH}\n${linhasHex.join("\n")}\n}`;
}

// Paleta como índice na tabela de cores do RTF (ordem importa).
const COLORS = ["auto", "101828", "1B4D99", "64749A", "0F8A5F", "B8760F", "C23A2F", "FFFFFF", "0A1E3F", "F7F9FC", "DBE2EE"] as const;
const [, C_INK, C_BRAND, C_SLATE, C_SUCCESS, C_WARNING, C_DANGER, C_WHITE, C_NAVY, C_SLATE_LIGHT, C_BORDER] = COLORS.map((_, i) => i);

function esc(texto: string): string {
  return String(texto ?? "")
    .split("")
    .map((ch) => {
      const code = ch.codePointAt(0) ?? 0;
      if (ch === "\\") return "\\\\";
      if (ch === "{") return "\\{";
      if (ch === "}") return "\\}";
      if (ch === "\n") return "\\line ";
      if (code > 126) return `\\u${code}?`;
      return ch;
    })
    .join("");
}

interface RunOpts {
  bold?: boolean;
  italic?: boolean;
  size?: number; // em pt
  color?: number;
  bg?: number;
  font?: 0 | 1 | 2; // 0=display, 1=corpo, 2=mono
  caps?: boolean;
  letterSpacing?: number; // em twips (~1/20 pt), usado só de leve
}

function run(texto: string, opts: RunOpts = {}): string {
  const parts: string[] = [];
  if (opts.font !== undefined) parts.push(`\\f${opts.font}`);
  if (opts.size) parts.push(`\\fs${opts.size * 2}`);
  if (opts.color !== undefined) parts.push(`\\cf${opts.color}`);
  if (opts.bg !== undefined) parts.push(`\\highlight${opts.bg}`);
  if (opts.bold) parts.push("\\b");
  if (opts.italic) parts.push("\\i");
  if (opts.caps) parts.push("\\caps");
  return `{${parts.join("")} ${esc(opts.caps ? texto.toUpperCase() : texto)}}`;
}

interface ParaOpts {
  align?: "l" | "c" | "r";
  spaceBefore?: number;
  spaceAfter?: number;
  borderBottom?: boolean;
}

// Monta o preâmbulo \pard de um parágrafo, sem tocar no conteúdo — usado
// tanto por para() (que escapa o texto) quanto por paraRaw() (que recebe
// markup RTF já pronto, ex: um campo HYPERLINK, e não pode ser escapado de novo).
function pardPreambulo(paraOpts: ParaOpts): string {
  const align = paraOpts.align === "c" ? "\\qc" : paraOpts.align === "r" ? "\\qr" : "\\ql";
  const sb = paraOpts.spaceBefore !== undefined ? `\\sb${paraOpts.spaceBefore}` : "";
  const sa = paraOpts.spaceAfter !== undefined ? `\\sa${paraOpts.spaceAfter}` : "\\sa120";
  const border = paraOpts.borderBottom ? `\\brdrb\\brdrs\\brdrw10\\brsp40\\brdrcf${C_BORDER}` : "";
  return `\\pard${align}${sb}${sa}${border}`;
}

function para(texto: string, runOpts: RunOpts = {}, paraOpts: ParaOpts = {}): string {
  return `${pardPreambulo(paraOpts)} ${run(texto, runOpts)}\\par\n`;
}

// Pra conteúdo que já é markup RTF pronto (ex: um campo HYPERLINK) — nunca
// passar texto solto aqui, ele não passa pelo esc().
function paraRaw(rtf: string, paraOpts: ParaOpts = {}): string {
  return `${pardPreambulo(paraOpts)} ${rtf}\\par\n`;
}

interface Celula {
  texto: string;
  run?: RunOpts;
  bg?: number;
  pict?: { hex: string; width: number; height: number };
  legenda?: string;
}

// Uma tabela simples: cada linha é um array de células, larguras em frações (somam 1).
function tabela(linhas: Celula[][], larguras: number[]): string {
  let out = "";
  const bordas = "\\clbrdrt\\brdrs\\brdrw5\\brdrcf" + C_BORDER + "\\clbrdrb\\brdrs\\brdrw5\\brdrcf" + C_BORDER + "\\clbrdrl\\brdrs\\brdrw5\\brdrcf" + C_BORDER + "\\clbrdrr\\brdrs\\brdrw5\\brdrcf" + C_BORDER;
  for (const linha of linhas) {
    out += "\\trowd\\trgaph80\\trleft0\\trpaddl80\\trpaddr80\\trpaddt60\\trpaddb60\n";
    let acumulado = 0;
    for (const largura of larguras) {
      acumulado += Math.round(largura * PAGE_WIDTH_TWIPS);
      out += `${bordas}\\cellx${acumulado}\n`;
    }
    for (let i = 0; i < linha.length; i++) {
      const celula = linha[i];
      const bg = celula.bg !== undefined ? `\\clcbpat${celula.bg}` : "";
      if (celula.pict) {
        out += `\\pard\\intbl\\qc${bg} ${pictBlock(celula.pict)}\\par\n`;
        if (celula.legenda) out += `\\pard\\intbl\\qc ${run(celula.legenda, { size: 8, color: C_SLATE, font: 1 })}\\par\n`;
        out += "\\cell\n";
      } else {
        out += `\\pard\\intbl${bg} ${run(celula.texto, celula.run)}\\cell\n`;
      }
    }
    out += "\\row\n";
  }
  return out;
}

function eyebrow(texto: string): string {
  return para(texto, { bold: true, size: 9, color: C_BRAND, font: 1, caps: true }, { spaceBefore: 240, spaceAfter: 40 });
}

function pageTitle(texto: string): string {
  return para(texto, { bold: true, size: 20, color: C_NAVY, font: 0 }, { spaceAfter: 160 });
}

function pageBreak(): string {
  return "\\page\n";
}

// Link clicável de verdade (campo HYPERLINK do RTF) — útil quando o sistema
// que recebe o RTF (Mantec) descarta imagens e só o QR não bastaria.
function hyperlink(url: string, texto: string): string {
  return `{\\field{\\*\\fldinst HYPERLINK "${url}"}{\\fldrslt ${run(texto, { color: C_BRAND, size: 8, font: 2 })}}}`;
}

async function buildCapa(data: ParadaCompleta): Promise<string> {
  const { resumo } = data;
  let out = "";

  const url = urlDaParada(resumo.id);
  const qr = await gerarQrCodeBuffer(url, 180).catch(() => null);
  if (qr) {
    const dims = imageSize(qr);
    if (dims.width && dims.height) {
      out += tabela(
        [[{ texto: "", pict: { hex: qr.toString("hex"), width: dims.width, height: dims.height } }]],
        [1]
      );
      out += paraRaw(`${run("Relatório digital ao vivo: ", { size: 8, color: C_SLATE, font: 1 })}${hyperlink(url, url)}`, { align: "c", spaceAfter: 200 });
    }
  }

  out += para(`${resumo.area.toUpperCase()} · RELATÓRIO DIGITAL`, { bold: true, color: C_BRAND, size: 9, font: 1, caps: true }, { spaceBefore: 200, spaceAfter: 40 });
  out += para(resumo.nome, { bold: true, color: C_NAVY, size: 28, font: 0 }, { spaceAfter: 40 });
  out += para(resumo.maquina, { italic: true, color: C_BRAND, size: 13, font: 1 }, { spaceAfter: 200 });
  out += para(`  ${statusLabel(resumo.status).toUpperCase()}  `, { bold: true, color: C_WHITE, bg: 2, size: 9, font: 1 }, { spaceAfter: 200 });

  const campos: Array<[string, string]> = [
    ["Data da Parada", formatDate(resumo.data)],
    ["Tempo Planejado", resumo.duracaoPlanejada],
    ["Tempo Realizado", resumo.duracaoRealizada],
    ["Responsável", resumo.responsavel],
  ];
  const linhas: Celula[][] = [];
  for (let i = 0; i < campos.length; i += 2) {
    const par = campos.slice(i, i + 2);
    linhas.push(
      par.map(([label, valor]) => ({ texto: `${label.toUpperCase()}\n${valor}`, run: { size: 11, color: C_INK, font: 1 } }))
    );
  }
  out += tabela(linhas, [0.5, 0.5]);
  return out;
}

function buildResumo(data: ParadaCompleta): string {
  const { kpis } = data;
  const cards: Array<[string, string]> = [
    ["OS Planejadas", String(kpis.osPlanejadas)],
    ["OS Concluídas", String(kpis.osConcluidas)],
    ["Eficiência", `${kpis.eficiencia}%`],
    ["Horas Trabalhadas", String(kpis.horasTrabalhadas)],
    ["OS Elétrica", String(kpis.equipeEletrica)],
    ["OS Mecânica", String(kpis.equipeMecanica)],
    ["OS Instrumentação", String(kpis.equipeInstrumentacao)],
    ["Segurança", `${kpis.seguranca}%`],
    ["Pendências", String(kpis.pendencias)],
    ["Etiqueta Vermelha", String(kpis.etiquetaVermelha)],
    ["Etiqueta Amarela", String(kpis.etiquetaAmarela)],
  ];
  let out = eyebrow("Resumo Executivo") + pageTitle("Indicadores Gerais da Parada");
  const linhas: Celula[][] = [];
  for (let i = 0; i < cards.length; i += 3) {
    const tri = cards.slice(i, i + 3);
    const linha: Celula[] = tri.map(([label, valor]) => ({ texto: `${valor}\n${label}`, run: { size: 14, bold: true, color: C_INK, font: 0 }, bg: C_SLATE_LIGHT }));
    while (linha.length < 3) linha.push({ texto: "", bg: C_SLATE_LIGHT });
    linhas.push(linha);
  }
  out += tabela(linhas, [1 / 3, 1 / 3, 1 / 3]);
  return out;
}

function buildTimeline(data: ParadaCompleta): string {
  let out = eyebrow("Cronologia da Parada") + pageTitle("Linha do Tempo");
  data.timeline.forEach((evento) => {
    out += `\\pard\\sb120\\sa20 ${run(evento.horario + "  ", { bold: true, color: C_BRAND, size: 10, font: 2 })}${run(evento.titulo, { bold: true, color: C_INK, size: 11, font: 1 })}\\par\n`;
    out += para(evento.descricao, { color: C_SLATE, size: 10, font: 1 }, { spaceAfter: 20 });
    out += para(`Responsável: ${evento.responsavel} · ${statusLabel(evento.status)}`, { italic: true, color: C_SLATE, size: 8, font: 1 }, { spaceAfter: 20, borderBottom: true });
  });
  return out;
}

async function buildServicos(data: ParadaCompleta, origin: string): Promise<string> {
  const servicos = servicosComFoto(data.servicos);
  let out = "";
  for (let i = 0; i < servicos.length; i++) {
    const servico = servicos[i];
    out += eyebrow(`Serviços Executados · ${i + 1}/${servicos.length}`);
    out += para(servico.titulo, { bold: true, color: C_INK, size: 15, font: 0 }, { spaceAfter: 100 });

    const meta: Array<[string, string]> = [
      ["OS", servico.numeroOS],
      ["Tempo Total", servico.tempoGasto],
      ["Equipamento", servico.equipamento],
      ["Local", servico.area],
      ["Área Responsável", `${servico.equipe} · ${servico.responsavel}`],
      ["Status", statusLabel(servico.status)],
    ];
    const linhas: Celula[][] = [];
    for (let j = 0; j < meta.length; j += 2) {
      const par = meta.slice(j, j + 2);
      linhas.push(par.map(([label, valor]) => ({ texto: `${label.toUpperCase()}\n${valor}`, run: { size: 10, bold: true, color: C_INK, font: 1 }, bg: C_SLATE_LIGHT })));
    }
    out += tabela(linhas, [0.5, 0.5]);

    const textos: Array<[string, string]> = [
      ["Problema Identificado", servico.problemaIdentificado],
      ["O Que Foi Feito", servico.servicoExecutado],
      ["Resultado", servico.resultado],
    ];
    textos.forEach(([label, valor]) => {
      out += para(label, { bold: true, color: C_BRAND, size: 8, font: 1, caps: true }, { spaceBefore: 120, spaceAfter: 20 });
      out += para(valor, { color: C_SLATE, size: 10, font: 1 }, { spaceAfter: 100 });
    });

    const fotosServico: Array<{ url: string; legenda: string }> = [
      ...(servico.fotoAntes && servico.fotoAntes !== NO_PHOTO_PLACEHOLDER ? [{ url: servico.fotoAntes, legenda: "Antes" }] : []),
      ...(servico.fotoDurante ? [{ url: servico.fotoDurante, legenda: "Durante" }] : []),
      ...(servico.fotoDepois && servico.fotoDepois !== NO_PHOTO_PLACEHOLDER ? [{ url: servico.fotoDepois, legenda: "Depois" }] : []),
    ];
    if (fotosServico.length > 0) {
      const celulas: Celula[] = [];
      for (const foto of fotosServico) {
        const pict = await fetchImagemRtf(foto.url, origin);
        if (pict) celulas.push({ texto: "", pict, legenda: fotosServico.length > 1 ? foto.legenda : undefined });
      }
      if (celulas.length > 0) {
        const largura = 1 / celulas.length;
        out += tabela([celulas], celulas.map(() => largura));
      }
    }

    if (i < servicos.length - 1) out += pageBreak();
  }
  return out;
}

function barraTexto(label: string, valor: number, max: number): Celula[] {
  const pct = max > 0 ? Math.max(4, Math.round((valor / max) * 30)) : 4;
  const barra = "█".repeat(pct) + "░".repeat(Math.max(0, 30 - pct));
  return [
    { texto: label, run: { size: 9, color: C_INK, font: 1 } },
    { texto: barra, run: { size: 9, color: C_BRAND, font: 2 } },
    { texto: String(valor), run: { size: 9, bold: true, color: C_INK, font: 1 } },
  ];
}

function buildGraficos(data: ParadaCompleta): string {
  const { graficos } = data;
  const maxEquipe = Math.max(1, ...graficos.osPorEquipe.map((d) => d.quantidade));
  const maxHoras = Math.max(1, ...graficos.horasPorSetor.map((d) => d.horas));
  const maxCategoria = Math.max(1, ...graficos.distribuicaoServicos.map((d) => d.valor));

  let out = eyebrow("Indicadores Visuais") + pageTitle("Gráficos de Desempenho");

  out += para("OS por Equipe", { bold: true, size: 11, color: C_INK, font: 1 }, { spaceBefore: 100, spaceAfter: 20 });
  out += tabela(graficos.osPorEquipe.map((d) => barraTexto(d.equipe, d.quantidade, maxEquipe)), [0.22, 0.63, 0.15]);

  out += para("Horas por Setor", { bold: true, size: 11, color: C_INK, font: 1 }, { spaceBefore: 160, spaceAfter: 20 });
  out += tabela(graficos.horasPorSetor.map((d) => barraTexto(d.setor, d.horas, maxHoras)), [0.22, 0.63, 0.15]);

  out += para("Distribuição dos Serviços", { bold: true, size: 11, color: C_INK, font: 1 }, { spaceBefore: 160, spaceAfter: 20 });
  out += tabela(graficos.distribuicaoServicos.map((d) => barraTexto(d.categoria, d.valor, maxCategoria)), [0.22, 0.63, 0.15]);

  out += para(`PERCENTUAL CONCLUÍDO: ${graficos.percentualConcluido}%`, { bold: true, color: C_WHITE, bg: 8, size: 13, font: 0 }, { align: "c", spaceBefore: 200 });
  return out;
}

function buildGraficosServico(data: ParadaCompleta): string {
  const { graficos } = data;
  const maxHorasServico = Math.max(1, ...graficos.horasPorServico.map((d) => d.horas));
  let out = eyebrow("Indicadores Visuais") + pageTitle("Horas por Serviço");
  out += tabela(graficos.horasPorServico.map((d) => barraTexto(d.servico, d.horas, maxHorasServico)), [0.35, 0.5, 0.15]);
  return out;
}

function buildCaminhoCritico(data: ParadaCompleta): string {
  let out = eyebrow("Cronograma Crítico") + pageTitle("Caminho Crítico");
  const cabecalho = ["Serviço", "Início Pl.", "Fim Pl.", "Início Real", "Fim Real", "Diferença", "Responsável", "Status"];
  const larguras = [0.2, 0.1, 0.1, 0.1, 0.1, 0.12, 0.16, 0.12];
  const linhas: Celula[][] = [cabecalho.map((h) => ({ texto: h, run: { bold: true, color: C_WHITE, size: 8, font: 1 }, bg: C_INK }))];
  data.caminhoCritico.forEach((item, i) => {
    const bg = i % 2 === 1 ? C_SLATE_LIGHT : undefined;
    const diffColor = item.diferencaMin > 60 ? C_DANGER : item.diferencaMin > 0 ? C_WARNING : C_SUCCESS;
    const valores = [item.servico, item.inicioPlanejado, item.fimPlanejado, item.inicioReal, item.fimReal, item.diferencaMin === 0 ? "No prazo" : `+${item.diferencaMin} min`, item.responsavel, statusLabel(item.status)];
    linhas.push(valores.map((texto, ci) => ({ texto, run: { size: 8, color: ci === 5 ? diffColor : C_INK, bold: ci === 0 || ci === 5, font: ci >= 1 && ci <= 4 ? 2 : 1 }, bg })));
  });
  out += tabela(linhas, larguras);
  return out;
}

function buildResultado(data: ParadaCompleta): string {
  const { resultadoFinal: resultado, pendencias } = data;
  const titulo = resultado.selo === "concluida" ? "PARADA CONCLUÍDA COM SUCESSO" : resultado.selo === "ressalvas" ? "PARADA CONCLUÍDA COM RESSALVAS" : "PARADA EM ANDAMENTO";
  const seloColor = resultado.selo === "concluida" ? C_SUCCESS : resultado.selo === "ressalvas" ? C_WARNING : C_BRAND;

  let out = para("RESULTADO FINAL", { bold: true, color: C_BRAND, size: 9, font: 1, caps: true }, { align: "c", spaceBefore: 200, spaceAfter: 40 });
  out += para(titulo, { bold: true, color: seloColor, size: 16, font: 0 }, { align: "c", spaceAfter: 60 });
  out += para(resultado.resumo, { color: C_SLATE, size: 11, font: 1 }, { align: "c", spaceAfter: 200 });

  const metricas: Array<[string, string]> = [
    ["Tempo Planejado", `${resultado.tempoPlanejadoHoras}h`],
    ["Tempo Realizado", `${resultado.tempoRealizadoHoras}h`],
    ["Eficiência", `${resultado.eficiencia}%`],
    ["Disponibilidade", `${resultado.disponibilidade}%`],
  ];
  const linhas: Celula[][] = [];
  for (let i = 0; i < metricas.length; i += 2) {
    const par = metricas.slice(i, i + 2);
    linhas.push(par.map(([label, valor]) => ({ texto: `${valor}\n${label}`, run: { bold: true, size: 14, color: C_INK, font: 0 }, bg: C_SLATE_LIGHT })));
  }
  out += tabela(linhas, [0.5, 0.5]);

  if (pendencias.length > 0) {
    out += para("Pendências em Aberto", { bold: true, color: C_BRAND, size: 12, font: 0 }, { spaceBefore: 240, spaceAfter: 80 });
    pendencias.forEach((p) => {
      out += para(`• ${p.item} — ${p.motivo}`, { size: 10, color: C_INK, font: 1 }, { spaceAfter: 40 });
    });
  }
  return out;
}

async function buildRtf(data: ParadaCompleta, origin: string): Promise<string> {
  const fontTable = "{\\fonttbl{\\f0\\froman Cambria;}{\\f1\\fswiss Calibri;}{\\f2\\fmodern Consolas;}}";
  const colorTable = "{\\colortbl;" + COLORS.slice(1).map((hex) => `\\red${parseInt(hex.slice(0, 2), 16)}\\green${parseInt(hex.slice(2, 4), 16)}\\blue${parseInt(hex.slice(4, 6), 16)};`).join("") + "}";

  let body = "";
  body += await buildCapa(data);
  body += pageBreak();
  body += buildResumo(data);
  if (data.timeline.length > 0) {
    body += pageBreak();
    body += buildTimeline(data);
  }
  const servicos = servicosComFoto(data.servicos);
  if (servicos.length > 0) {
    body += pageBreak();
    body += await buildServicos(data, origin);
  }
  body += pageBreak();
  body += buildGraficos(data);
  body += pageBreak();
  body += buildGraficosServico(data);
  if (data.caminhoCritico.length > 0) {
    body += pageBreak();
    body += buildCaminhoCritico(data);
  }
  body += pageBreak();
  body += buildResultado(data);

  return `{\\rtf1\\ansi\\ansicpg1252\\deff1\\deflang1046\n${fontTable}\n${colorTable}\n\\margl1440\\margr1440\\margt1440\\margb1440\n${body}}`;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // O proxy.ts ja barra /api/export sem sessao, mas a autorizacao de verdade
  // mora aqui: o proxy e uma checagem otimista de borda (a propria doc do Next
  // desaconselha trata-lo como camada de autorizacao), e uma rota que so
  // depende dele fica desprotegida a qualquer mudanca no matcher.
  //
  // Ver o relatorio na tela continua publico — e o que faz o QR code da capa
  // funcionar. Baixar o arquivo nao: o export leva o relatorio inteiro, com
  // todas as fotos e nomes dos responsaveis, num arquivo que sai do controle
  // do app assim que e salvo.
  if (!(await ehEditor())) {
    return new Response("Nao autorizado.", { status: 401 });
  }

  // Id vem da URL: passa pelo mesmo saneamento das actions antes de virar
  // consulta. Id fora do formato e simplesmente um relatorio que nao existe.
  let idLimpo: string;
  try {
    idLimpo = sanearId(id);
  } catch {
    return new Response("Relatório não encontrado", { status: 404 });
  }

  const data = await getParadaCompleta(idLimpo);
  if (!data) return new Response("Relatório não encontrado.", { status: 404 });

  const rtf = await buildRtf(data, req.nextUrl.origin);
  const nomeArquivo = `relatorio-${idLimpo}.rtf`;

  return new Response(rtf, {
    headers: {
      "Content-Type": "application/rtf; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nomeArquivo}"`,
    },
  });
}
