import { NextRequest } from "next/server";
import PptxGenJS from "pptxgenjs";
import { getParadaCompleta } from "@/lib/actions/paradas";
import { NO_PHOTO_PLACEHOLDER } from "@/lib/image-utils";
import { servicosComFoto } from "@/lib/derive";
import { formatDate, statusLabel } from "@/lib/utils";
import type { ParadaCompleta } from "@/lib/types";

export const dynamic = "force-dynamic";

const NAVY = "0A1E3F";
const NAVY_DEEP = "041124";
const BRAND = "1B4D99";
const BRAND_LIGHT = "7FABE5";
const BRAND_PALE = "DCE8F8";
const SIGNAL = "F2A930";
const WHITE = "FFFFFF";
const INK = "101828";
const SLATE = "64749A";
const SLATE_LIGHT = "F7F9FC";
const BORDER = "DBE2EE";
const SUCCESS = "0F8A5F";
const WARNING = "B8760F";
const DANGER = "C23A2F";

const HEAD = "Cambria";
const BODY = "Calibri";

async function toDataUri(url: string, origin: string): Promise<string | null> {
  try {
    const absolute = url.startsWith("http") ? url : new URL(url, origin).toString();
    const res = await fetch(absolute);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const contentType = res.headers.get("content-type") || "image/jpeg";
    return `data:${contentType};base64,${Buffer.from(buf).toString("base64")}`;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getParadaCompleta(id);
  if (!data) return new Response("Relatório não encontrado", { status: 404 });

  const origin = new URL(request.url).origin;
  const logoUri = await toDataUri("/santher-logo-branco.png", origin);

  const pres = new PptxGenJS();
  pres.layout = "LAYOUT_WIDE";
  pres.author = "Santher — Relatório Digital de Parada";
  pres.title = data.resumo.nome;

  defineMasters(pres, logoUri);

  await addCapa(pres, data, origin);
  addResumo(pres, data);
  addTimeline(pres, data);
  await addServicos(pres, data, origin);
  await addGaleria(pres, data, origin);
  addGraficos(pres, data);
  addCaminhoCritico(pres, data);
  addResultado(pres, data);

  const buffer = (await pres.write({ outputType: "nodebuffer" })) as Buffer;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": `attachment; filename="relatorio-${id}.pptx"`,
    },
  });
}

function defineMasters(pres: PptxGenJS, logoUri: string | null) {
  pres.defineSlideMaster({
    title: "CONTENT",
    background: { color: WHITE },
    objects: [
      { rect: { x: 0, y: 0, w: 0.12, h: 7.5, fill: { color: SIGNAL } } },
      ...(logoUri ? [{ image: { data: logoUri, x: 11.9, y: 0.35, w: 1.1, h: 0.28 } }] : []),
      { line: { x: 0.5, y: 7.15, w: 12.3, h: 0, line: { color: BORDER, width: 0.75 } } },
      { text: { text: "SANTHER — RELATÓRIO DIGITAL", options: { x: 0.5, y: 7.2, w: 6, h: 0.25, fontSize: 8, fontFace: BODY, color: SLATE, charSpacing: 1 } } },
    ],
  });
  pres.defineSlideMaster({
    title: "DARK",
    background: { color: NAVY },
    objects: [
      { rect: { x: 0, y: 0, w: 0.14, h: 7.5, fill: { color: SIGNAL } } },
      { line: { x: 0.5, y: 7.15, w: 12.3, h: 0, line: { color: "1B4D99", width: 0.75 } } },
      { text: { text: "SANTHER — RELATÓRIO DIGITAL", options: { x: 0.5, y: 7.2, w: 6, h: 0.25, fontSize: 8, fontFace: BODY, color: BRAND_LIGHT, charSpacing: 1 } } },
    ],
  });
}

function eyebrow(slide: PptxGenJS.Slide, texto: string, dark = false) {
  slide.addText(texto.toUpperCase(), {
    x: 0.55,
    y: 0.4,
    w: 8,
    h: 0.3,
    fontSize: 11,
    bold: true,
    color: dark ? BRAND_LIGHT : BRAND,
    fontFace: BODY,
    charSpacing: 2,
  });
}

function pageTitle(slide: PptxGenJS.Slide, texto: string, dark = false) {
  slide.addText(texto, { x: 0.55, y: 0.72, w: 10, h: 0.6, fontSize: 26, bold: true, color: dark ? WHITE : INK, fontFace: HEAD });
}

async function addCapa(pres: PptxGenJS, data: ParadaCompleta, origin: string) {
  const { resumo } = data;
  const slide = pres.addSlide({ masterName: "DARK" });

  slide.addText(`${resumo.area.toUpperCase()} · RELATÓRIO DIGITAL`, {
    x: 0.6,
    y: 0.7,
    w: 7.5,
    h: 0.4,
    fontSize: 12,
    bold: true,
    color: BRAND_LIGHT,
    fontFace: BODY,
    charSpacing: 2,
  });
  slide.addText(resumo.nome, { x: 0.6, y: 1.15, w: 7.6, h: 1.6, fontSize: 38, bold: true, color: WHITE, fontFace: HEAD });
  slide.addText(resumo.maquina, { x: 0.6, y: 2.65, w: 7.5, h: 0.5, fontSize: 17, color: BRAND_PALE, fontFace: BODY, italic: true });

  slide.addShape(pres.ShapeType.roundRect, {
    x: 0.6,
    y: 3.4,
    w: 3.2,
    h: 0.42,
    rectRadius: 0.06,
    fill: { color: WHITE, transparency: 93 },
    line: { color: WHITE, width: 0.75, transparency: 70 },
  });
  slide.addText(statusLabel(resumo.status).toUpperCase(), { x: 0.6, y: 3.4, w: 3.2, h: 0.42, align: "center", valign: "middle", fontSize: 10, bold: true, color: WHITE, fontFace: BODY, charSpacing: 1 });

  const campos: Array<[string, string]> = [
    ["Data da Parada", formatDate(resumo.data)],
    ["Tempo Planejado", resumo.duracaoPlanejada],
    ["Tempo Realizado", resumo.duracaoRealizada],
    ["Responsável", resumo.responsavel],
  ];
  const blockY = 4.1;
  slide.addShape(pres.ShapeType.rect, { x: 0.6, y: blockY, w: 7.4, h: 1.9, fill: { color: WHITE, transparency: 95 }, line: { color: WHITE, width: 0.5, transparency: 80 } });
  campos.forEach(([label, value], i) => {
    const x = 0.6 + (i % 2) * 3.7;
    const y = blockY + Math.floor(i / 2) * 0.95 + 0.2;
    slide.addText(label.toUpperCase(), { x, y, w: 3.4, h: 0.3, fontSize: 9, bold: true, color: BRAND_LIGHT, fontFace: BODY, charSpacing: 1 });
    slide.addText(value, { x, y: y + 0.28, w: 3.4, h: 0.4, fontSize: 15, bold: true, color: WHITE, fontFace: BODY });
  });

  const foto = resumo.fotosMaquina?.[0];
  if (foto) {
    const uri = await toDataUri(foto, origin);
    if (uri) {
      slide.addImage({ data: uri, x: 8.5, y: 0.9, w: 4.2, h: 4.2, sizing: { type: "cover", w: 4.2, h: 4.2 } });
      slide.addShape(pres.ShapeType.rect, { x: 8.5, y: 0.9, w: 4.2, h: 4.2, fill: { type: "none" }, line: { color: SIGNAL, width: 2 } });
    }
  }
}

function addResumo(pres: PptxGenJS, data: ParadaCompleta) {
  const { kpis } = data;
  const slide = pres.addSlide({ masterName: "CONTENT" });
  eyebrow(slide, "Resumo Executivo");
  pageTitle(slide, "Indicadores Gerais da Parada");

  const cards: Array<[string, string]> = [
    ["OS Planejadas", String(kpis.osPlanejadas)],
    ["OS Concluídas", String(kpis.osConcluidas)],
    ["Eficiência", `${kpis.eficiencia}%`],
    ["Horas Trabalhadas", String(kpis.horasTrabalhadas)],
    ["Equipe Elétrica", String(kpis.equipeEletrica)],
    ["Equipe Mecânica", String(kpis.equipeMecanica)],
    ["Instrumentista", String(kpis.equipeInstrumentacao)],
    ["Segurança", `${kpis.seguranca}%`],
    ["Pendências", String(kpis.pendencias)],
  ];
  cards.forEach(([label, value], i) => {
    const col = i % 5;
    const row = Math.floor(i / 5);
    const x = 0.55 + col * 2.42;
    const y = 1.65 + row * 2.35;
    slide.addShape(pres.ShapeType.roundRect, { x, y, w: 2.24, h: 2.05, rectRadius: 0.08, fill: { color: SLATE_LIGHT }, line: { color: BORDER, width: 1 } });
    slide.addShape(pres.ShapeType.roundRect, { x: x + 0.16, y: y + 0.18, w: 0.42, h: 0.42, rectRadius: 0.08, fill: { color: BRAND, transparency: 87 } });
    slide.addText(value, { x, y: y + 0.7, w: 2.24, h: 0.75, align: "center", fontSize: 28, bold: true, color: INK, fontFace: HEAD });
    slide.addText(label, { x, y: y + 1.48, w: 2.24, h: 0.5, align: "center", fontSize: 10, color: SLATE, fontFace: BODY });
  });
}

function addTimeline(pres: PptxGenJS, data: ParadaCompleta) {
  if (data.timeline.length === 0) return;
  const CHUNK = 6;
  for (let i = 0; i < data.timeline.length; i += CHUNK) {
    const slide = pres.addSlide({ masterName: "CONTENT" });
    eyebrow(slide, "Cronologia da Parada");
    pageTitle(slide, "Linha do Tempo");

    const chunk = data.timeline.slice(i, i + CHUNK);
    chunk.forEach((evento, j) => {
      const y = 1.75 + j * 0.85;
      slide.addShape(pres.ShapeType.ellipse, { x: 0.55, y: y + 0.04, w: 0.32, h: 0.32, fill: { color: BRAND, transparency: 87 }, line: { color: BRAND, width: 1 } });
      slide.addText(evento.horario, { x: 1.05, y, w: 1.0, h: 0.65, fontSize: 10, bold: true, color: BRAND, fontFace: "Consolas", valign: "middle" });
      slide.addText(evento.titulo, { x: 2.1, y, w: 8.2, h: 0.35, fontSize: 13, bold: true, color: INK, fontFace: BODY });
      slide.addText(evento.descricao, { x: 2.1, y: y + 0.33, w: 8.2, h: 0.5, fontSize: 10, color: SLATE, fontFace: BODY });
    });
  }
}

async function addServicos(pres: PptxGenJS, data: ParadaCompleta, origin: string) {
  const servicos = servicosComFoto(data.servicos);
  for (let i = 0; i < servicos.length; i++) {
    const s = servicos[i];
    const slide = pres.addSlide({ masterName: "CONTENT" });

    eyebrow(slide, `Serviços Executados · ${i + 1}/${servicos.length}`);
    slide.addText(s.titulo, { x: 0.55, y: 0.72, w: 6.3, h: 0.85, fontSize: 19, bold: true, color: INK, fontFace: HEAD });

    slide.addShape(pres.ShapeType.roundRect, { x: 0.55, y: 1.6, w: 6.35, h: 1.9, rectRadius: 0.06, fill: { color: SLATE_LIGHT }, line: { color: BORDER, width: 0.75 } });
    const meta: Array<[string, string]> = [
      ["OS", s.numeroOS],
      ["Tempo Total", s.tempoGasto],
      ["Equipamento", s.equipamento],
      ["Local", s.area],
      ["Área Responsável", `${s.equipe} · ${s.responsavel}`],
      ["Status", statusLabel(s.status)],
    ];
    meta.forEach(([label, value], j) => {
      const col = j % 2;
      const row = Math.floor(j / 2);
      const x = 0.75 + col * 3.1;
      const y = 1.75 + row * 0.58;
      slide.addText(label.toUpperCase(), { x, y, w: 2.9, h: 0.22, fontSize: 7.5, bold: true, color: SLATE, fontFace: BODY });
      slide.addText(value, { x, y: y + 0.19, w: 2.9, h: 0.3, fontSize: 10.5, bold: true, color: INK, fontFace: BODY });
    });

    const textos: Array<[string, string]> = [
      ["Problema Identificado", s.problemaIdentificado],
      ["O Que Foi Feito", s.servicoExecutado],
      ["Resultado", s.resultado],
    ];
    let ty = 3.75;
    textos.forEach(([label, value]) => {
      slide.addText(label.toUpperCase(), { x: 0.55, y: ty, w: 6.35, h: 0.24, fontSize: 8, bold: true, color: BRAND, fontFace: BODY });
      slide.addText(value, { x: 0.55, y: ty + 0.21, w: 6.35, h: 0.6, fontSize: 9.5, color: SLATE, fontFace: BODY, valign: "top" });
      ty += 0.88;
    });

    const fotos = [
      ...(s.fotoAntes && s.fotoAntes !== NO_PHOTO_PLACEHOLDER ? [s.fotoAntes] : []),
      ...(s.fotoDurante ? [s.fotoDurante] : []),
      ...(s.fotoDepois && s.fotoDepois !== NO_PHOTO_PLACEHOLDER ? [s.fotoDepois] : []),
    ].slice(0, 2);

    for (let f = 0; f < fotos.length; f++) {
      const uri = await toDataUri(fotos[f], origin);
      if (!uri) continue;
      const y = 0.7 + f * 3.15;
      slide.addImage({ data: uri, x: 7.15, y, w: 5.55, h: 2.95, sizing: { type: "cover", w: 5.55, h: 2.95 } });
      slide.addShape(pres.ShapeType.rect, { x: 7.15, y, w: 5.55, h: 2.95, fill: { type: "none" }, line: { color: WHITE, width: 2.5 } });
    }
  }
}

async function addGaleria(pres: PptxGenJS, data: ParadaCompleta, origin: string) {
  if (data.fotos.length === 0) return;
  const PER_SLIDE = 8;
  for (let i = 0; i < data.fotos.length; i += PER_SLIDE) {
    const slide = pres.addSlide({ masterName: "CONTENT" });
    eyebrow(slide, "Registro Fotográfico");
    pageTitle(slide, "Galeria Antes, Durante & Depois");

    const chunk = data.fotos.slice(i, i + PER_SLIDE);
    for (let j = 0; j < chunk.length; j++) {
      const uri = await toDataUri(chunk[j].url, origin);
      if (!uri) continue;
      const col = j % 4;
      const row = Math.floor(j / 4);
      const x = 0.55 + col * 3.1;
      const y = 1.55 + row * 2.75;
      slide.addImage({ data: uri, x, y, w: 2.85, h: 2.5, sizing: { type: "cover", w: 2.85, h: 2.5 } });
      slide.addShape(pres.ShapeType.rect, { x, y, w: 2.85, h: 2.5, fill: { type: "none" }, line: { color: WHITE, width: 2 } });
    }
  }
}

function addGraficos(pres: PptxGenJS, data: ParadaCompleta) {
  const { graficos } = data;
  const slide = pres.addSlide({ masterName: "CONTENT" });
  eyebrow(slide, "Indicadores Visuais");
  pageTitle(slide, "Gráficos de Desempenho");

  const axisOpts = { catAxisLabelColor: SLATE, catAxisLabelFontSize: 9, valAxisLabelColor: SLATE, valAxisLabelFontSize: 9, valGridLine: { color: BORDER, size: 0.75 }, catGridLine: { style: "none" as const } };

  slide.addChart(
    pres.ChartType.bar,
    [{ name: "OS por Equipe", labels: graficos.osPorEquipe.map((d) => d.equipe), values: graficos.osPorEquipe.map((d) => d.quantidade) }],
    { x: 0.5, y: 1.55, w: 4.3, h: 2.9, showTitle: true, title: "OS por Equipe", titleFontSize: 11, titleColor: INK, showValue: true, dataLabelFontSize: 9, chartColors: [BRAND], showLegend: false, ...axisOpts }
  );
  slide.addChart(
    pres.ChartType.bar,
    [{ name: "Horas por Setor", labels: graficos.horasPorSetor.map((d) => d.setor), values: graficos.horasPorSetor.map((d) => d.horas) }],
    { x: 4.95, y: 1.55, w: 4.3, h: 2.9, showTitle: true, title: "Horas por Setor", titleFontSize: 11, titleColor: INK, showValue: true, dataLabelFontSize: 9, barDir: "bar", chartColors: [BRAND_LIGHT], showLegend: false, ...axisOpts }
  );
  slide.addChart(
    pres.ChartType.pie,
    [{ name: "Distribuição", labels: graficos.distribuicaoServicos.map((d) => d.categoria), values: graficos.distribuicaoServicos.map((d) => d.valor) }],
    { x: 9.45, y: 1.55, w: 3.35, h: 2.9, showTitle: true, title: "Distribuição", titleFontSize: 11, titleColor: INK, showLegend: true, legendPos: "b", legendFontSize: 8, chartColors: [BRAND, BRAND_LIGHT, "B7CFF0", NAVY_DEEP] }
  );

  slide.addShape(pres.ShapeType.roundRect, { x: 0.5, y: 4.75, w: 3.3, h: 2.0, rectRadius: 0.08, fill: { color: NAVY } });
  slide.addText("PERCENTUAL CONCLUÍDO", { x: 0.5, y: 4.95, w: 3.3, h: 0.3, align: "center", fontSize: 9, bold: true, color: BRAND_LIGHT, fontFace: BODY, charSpacing: 1 });
  slide.addText(`${graficos.percentualConcluido}%`, { x: 0.5, y: 5.3, w: 3.3, h: 1.1, align: "center", fontSize: 42, bold: true, color: WHITE, fontFace: HEAD });
}

function addCaminhoCritico(pres: PptxGenJS, data: ParadaCompleta) {
  if (data.caminhoCritico.length === 0) return;
  const slide = pres.addSlide({ masterName: "CONTENT" });
  eyebrow(slide, "Cronograma Crítico");
  pageTitle(slide, "Caminho Crítico");

  const header = ["Serviço", "Início Planej.", "Fim Planej.", "Início Real", "Fim Real", "Diferença", "Responsável", "Status"];
  const rows: PptxGenJS.TableRow[] = [
    header.map((h) => ({ text: h, options: { bold: true, color: WHITE, fill: { color: INK }, fontSize: 9, fontFace: BODY } })),
    ...data.caminhoCritico.map((item, i) => {
      const bg = i % 2 === 1 ? SLATE_LIGHT : WHITE;
      const diffColor = item.diferencaMin > 60 ? DANGER : item.diferencaMin > 0 ? WARNING : SUCCESS;
      return [
        { text: item.servico, options: { fontSize: 9, bold: true, fill: { color: bg }, fontFace: BODY } },
        { text: item.inicioPlanejado, options: { fontSize: 9, fill: { color: bg }, fontFace: "Consolas" } },
        { text: item.fimPlanejado, options: { fontSize: 9, fill: { color: bg }, fontFace: "Consolas" } },
        { text: item.inicioReal, options: { fontSize: 9, fill: { color: bg }, fontFace: "Consolas" } },
        { text: item.fimReal, options: { fontSize: 9, fill: { color: bg }, fontFace: "Consolas" } },
        { text: item.diferencaMin === 0 ? "No prazo" : `+${item.diferencaMin} min`, options: { fontSize: 9, bold: true, color: diffColor, fill: { color: bg }, fontFace: BODY } },
        { text: item.responsavel, options: { fontSize: 9, fill: { color: bg }, fontFace: BODY } },
        { text: statusLabel(item.status), options: { fontSize: 9, fill: { color: bg }, fontFace: BODY } },
      ];
    }),
  ];
  slide.addTable(rows, { x: 0.5, y: 1.55, w: 12.3, colW: [2.8, 1.4, 1.4, 1.4, 1.4, 1.3, 1.5, 1.1], border: { type: "solid", color: BORDER, pt: 0.5 }, autoPage: true, autoPageSlideStartY: 1.0 });
}

function addResultado(pres: PptxGenJS, data: ParadaCompleta) {
  const { resultadoFinal: resultado, pendencias } = data;
  const slide = pres.addSlide({ masterName: "DARK" });

  const titulo =
    resultado.selo === "concluida"
      ? "PARADA CONCLUÍDA COM SUCESSO"
      : resultado.selo === "ressalvas"
        ? "PARADA CONCLUÍDA COM RESSALVAS"
        : "PARADA EM ANDAMENTO";
  const seloColor = resultado.selo === "concluida" ? SUCCESS : resultado.selo === "ressalvas" ? WARNING : BRAND;

  slide.addText("RESULTADO FINAL", { x: 0.5, y: 0.55, w: 12.3, h: 0.35, align: "center", fontSize: 12, bold: true, color: BRAND_LIGHT, fontFace: BODY, charSpacing: 2 });

  slide.addShape(pres.ShapeType.roundRect, { x: 3.65, y: 1.0, w: 6.0, h: 1.85, rectRadius: 0.1, fill: { color: seloColor, transparency: 87 }, line: { color: seloColor, width: 1.25 } });
  slide.addText(titulo, { x: 3.85, y: 1.25, w: 5.6, h: 0.5, align: "center", fontSize: 18, bold: true, color: WHITE, fontFace: HEAD });
  slide.addText(resultado.resumo, { x: 3.85, y: 1.75, w: 5.6, h: 1.0, align: "center", fontSize: 10, color: BRAND_PALE, fontFace: BODY, valign: "top" });

  const indicadores: Array<[string, string]> = [
    ["Tempo Planejado", `${resultado.tempoPlanejadoHoras}h`],
    ["Tempo Realizado", `${resultado.tempoRealizadoHoras}h`],
    ["Eficiência", `${resultado.eficiencia}%`],
    ["Disponibilidade", `${resultado.disponibilidade}%`],
    ["Pendências", String(resultado.pendenciasAbertas)],
  ];
  indicadores.forEach(([label, value], i) => {
    const x = 1.3 + i * 2.15;
    slide.addShape(pres.ShapeType.roundRect, { x, y: 3.2, w: 1.95, h: 1.35, rectRadius: 0.06, fill: { color: "143A73" }, line: { color: BRAND, width: 0.75 } });
    slide.addText(value, { x, y: 3.35, w: 1.95, h: 0.6, align: "center", fontSize: 22, bold: true, color: WHITE, fontFace: HEAD });
    slide.addText(label, { x, y: 3.9, w: 1.95, h: 0.5, align: "center", fontSize: 8, color: BRAND_LIGHT, fontFace: BODY });
  });

  if (pendencias.length > 0) {
    slide.addText("O QUE NÃO FOI FEITO", { x: 1.3, y: 4.9, w: 10.7, h: 0.3, fontSize: 10, bold: true, color: "FBEDD4", fontFace: BODY, charSpacing: 1 });
    const linhas = pendencias.map((p) => `${p.item} — ${p.motivo}`).join("\n");
    slide.addText(linhas, { x: 1.3, y: 5.25, w: 10.7, h: 1.7, fontSize: 10, color: BRAND_PALE, fontFace: BODY, valign: "top", lineSpacingMultiple: 1.3 });
  }
}
