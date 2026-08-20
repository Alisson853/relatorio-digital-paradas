import { NextRequest } from "next/server";
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  ImageRun,
  Packer,
  PageBreak,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from "docx";
import { getParadaCompleta } from "@/lib/actions/paradas";
import { NO_PHOTO_PLACEHOLDER } from "@/lib/image-utils";
import { servicosComFoto } from "@/lib/derive";
import { formatDate, statusLabel } from "@/lib/utils";
import type { ParadaCompleta } from "@/lib/types";

export const dynamic = "force-dynamic";

const NAVY = "0A1E3F";
const BRAND = "1B4D99";
const BRAND_PALE = "DCE8F8";
const SIGNAL = "F2A930";
const INK = "101828";
const SLATE = "64749A";
const SLATE_LIGHT = "F7F9FC";
const BORDER = "DBE2EE";
const SUCCESS = "0F8A5F";
const WARNING = "B8760F";
const DANGER = "C23A2F";
const WHITE = "FFFFFF";

const HEAD_FONT = "Cambria";
const BODY_FONT = "Calibri";

const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: WHITE };
const noBorders = { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER };

async function fetchImage(url: string, origin: string): Promise<Buffer | null> {
  try {
    const absolute = url.startsWith("http") ? url : new URL(url, origin).toString();
    const res = await fetch(absolute);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

function eyebrow(texto: string): Paragraph {
  return new Paragraph({
    spacing: { before: 120, after: 40 },
    border: { left: { style: BorderStyle.SINGLE, size: 24, color: SIGNAL, space: 8 } },
    children: [new TextRun({ text: texto.toUpperCase(), bold: true, color: BRAND, size: 16, font: BODY_FONT, characterSpacing: 20 })],
  });
}

function pageTitle(texto: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { after: 280 },
    children: [new TextRun({ text: texto, bold: true, color: INK, size: 36, font: HEAD_FONT })],
  });
}

function bodyText(texto: string, opts: Partial<{ color: string; size: number; bold: boolean; italics: boolean }> = {}): Paragraph {
  return new Paragraph({
    spacing: { after: 100 },
    children: [new TextRun({ text: texto, color: opts.color ?? INK, size: opts.size ?? 21, bold: opts.bold, italics: opts.italics, font: BODY_FONT })],
  });
}

function labelText(texto: string, color = SLATE): Paragraph {
  return new Paragraph({
    spacing: { after: 20 },
    children: [new TextRun({ text: texto.toUpperCase(), bold: true, color, size: 14, font: BODY_FONT, characterSpacing: 10 })],
  });
}

function pageBreak(): Paragraph {
  return new Paragraph({ children: [new PageBreak()] });
}

function kpiCell(label: string, value: string): TableCell {
  return new TableCell({
    width: { size: 33, type: WidthType.PERCENTAGE },
    margins: { top: 160, bottom: 160, left: 160, right: 160 },
    shading: { type: ShadingType.SOLID, color: SLATE_LIGHT, fill: SLATE_LIGHT },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: BORDER },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: BORDER },
      left: { style: BorderStyle.SINGLE, size: 4, color: BORDER },
      right: { style: BorderStyle.SINGLE, size: 4, color: BORDER },
    },
    children: [
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: value, bold: true, size: 40, color: INK, font: HEAD_FONT })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 40 }, children: [new TextRun({ text: label, size: 18, color: SLATE, font: BODY_FONT })] }),
    ],
  });
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getParadaCompleta(id);
  if (!data) return new Response("Relatório não encontrado", { status: 404 });

  const origin = new URL(request.url).origin;
  const logoBuf = await fetchImage("/santher-logo-azul.png", origin);

  const children: (Paragraph | Table)[] = [];

  children.push(...buildCapa(data));
  children.push(pageBreak());
  children.push(...buildResumo(data));
  children.push(pageBreak());
  if (data.timeline.length > 0) {
    children.push(...buildTimeline(data));
    children.push(pageBreak());
  }
  const servicosComFotoLista = servicosComFoto(data.servicos);
  for (let i = 0; i < servicosComFotoLista.length; i++) {
    children.push(...(await buildServico(servicosComFotoLista[i], i + 1, servicosComFotoLista.length, origin)));
    if (i < servicosComFotoLista.length - 1) children.push(pageBreak());
  }
  if (servicosComFotoLista.length > 0) children.push(pageBreak());
  if (data.fotos.length > 0) {
    children.push(...(await buildGaleria(data, origin)));
    children.push(pageBreak());
  }
  children.push(...buildGraficos(data));
  children.push(pageBreak());
  children.push(...buildGraficosServico(data));
  children.push(pageBreak());
  if (data.caminhoCritico.length > 0) {
    children.push(...buildCaminhoCritico(data));
    children.push(pageBreak());
  }
  children.push(...buildResultado(data));

  const doc = new Document({
    creator: "Santher — Relatório Digital de Parada",
    title: data.resumo.nome,
    styles: {
      default: { document: { run: { font: BODY_FONT, size: 21, color: INK } } },
    },
    sections: [
      {
        properties: { page: { margin: { top: 900, bottom: 900, left: 900, right: 900 } } },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                tabStops: [{ type: "right" as const, position: 9500 }],
                border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: BORDER, space: 4 } },
                children: [
                  ...(logoBuf ? [new ImageRun({ data: logoBuf, transformation: { width: 90, height: 24 }, type: "png" })] : [new TextRun({ text: "SANTHER", bold: true, color: BRAND, size: 18 })]),
                  new TextRun({ text: `\t${data.resumo.nome}`, size: 16, color: SLATE, font: BODY_FONT }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: "Santher — Relatório Digital de Parada  ·  Página ", size: 16, color: SLATE, font: BODY_FONT }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 16, color: SLATE, font: BODY_FONT }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="relatorio-${id}.docx"`,
    },
  });
}

function buildCapa(data: ParadaCompleta): (Paragraph | Table)[] {
  const { resumo } = data;
  const out: (Paragraph | Table)[] = [];

  out.push(
    new Paragraph({
      spacing: { before: 800, after: 60 },
      children: [new TextRun({ text: `${resumo.area.toUpperCase()} · RELATÓRIO DIGITAL`, bold: true, color: BRAND, size: 18, font: BODY_FONT, characterSpacing: 20 })],
    })
  );
  out.push(
    new Paragraph({
      spacing: { after: 100 },
      border: { left: { style: BorderStyle.SINGLE, size: 32, color: SIGNAL, space: 12 } },
      children: [new TextRun({ text: resumo.nome, bold: true, color: NAVY, size: 56, font: HEAD_FONT })],
    })
  );
  out.push(new Paragraph({ spacing: { after: 400 }, children: [new TextRun({ text: resumo.maquina, italics: true, color: BRAND, size: 26, font: BODY_FONT })] }));
  out.push(
    new Paragraph({
      spacing: { after: 300 },
      children: [
        new TextRun({
          text: `  ${statusLabel(resumo.status).toUpperCase()}  `,
          bold: true,
          color: WHITE,
          size: 18,
          font: BODY_FONT,
          shading: { type: ShadingType.SOLID, color: BRAND, fill: BRAND },
        }),
      ],
    })
  );

  const campos: Array<[string, string]> = [
    ["Data da Parada", formatDate(resumo.data)],
    ["Tempo Planejado", resumo.duracaoPlanejada],
    ["Tempo Realizado", resumo.duracaoRealizada],
    ["Responsável", resumo.responsavel],
  ];
  const rows: TableRow[] = chunk(campos, 2).map(
    (par) =>
      new TableRow({
        children: par.map(
          ([label, value]) =>
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              margins: { top: 160, bottom: 160, left: 200, right: 200 },
              borders: noBorders,
              children: [labelText(label), new Paragraph({ children: [new TextRun({ text: value, bold: true, size: 24, color: INK, font: BODY_FONT })] })],
            })
        ),
      })
  );
  out.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: noBorders, rows }));

  return out;
}

function buildResumo(data: ParadaCompleta): (Paragraph | Table)[] {
  const { kpis } = data;
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
    ["Etiqueta Vermelha", String(kpis.etiquetaVermelha)],
    ["Etiqueta Amarela", String(kpis.etiquetaAmarela)],
  ];
  const rows = chunk(cards, 3).map((tri) => new TableRow({ children: [...tri.map(([l, v]) => kpiCell(l, v)), ...Array(3 - tri.length).fill(null).map(() => new TableCell({ width: { size: 33, type: WidthType.PERCENTAGE }, borders: noBorders, children: [new Paragraph("")] }))] }));

  return [
    eyebrow("Resumo Executivo"),
    pageTitle("Indicadores Gerais da Parada"),
    new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows, layout: undefined }),
  ];
}

function buildTimeline(data: ParadaCompleta): (Paragraph | Table)[] {
  const out: (Paragraph | Table)[] = [eyebrow("Cronologia da Parada"), pageTitle("Linha do Tempo")];
  data.timeline.forEach((evento) => {
    out.push(
      new Paragraph({
        spacing: { before: 160, after: 20 },
        children: [
          new TextRun({ text: evento.horario + "  ", bold: true, color: BRAND, size: 20, font: "Consolas" }),
          new TextRun({ text: evento.titulo, bold: true, color: INK, size: 22, font: BODY_FONT }),
        ],
      })
    );
    out.push(new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: evento.descricao, color: SLATE, size: 19, font: BODY_FONT })] }));
    out.push(
      new Paragraph({
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: BORDER, space: 8 } },
        spacing: { after: 20 },
        children: [new TextRun({ text: `Responsável: ${evento.responsavel} · ${statusLabel(evento.status)}`, color: SLATE, size: 16, italics: true, font: BODY_FONT })],
      })
    );
  });
  return out;
}

async function buildServico(servico: ParadaCompleta["servicos"][number], indice: number, total: number, origin: string): Promise<(Paragraph | Table)[]> {
  const out: (Paragraph | Table)[] = [];
  out.push(eyebrow(`Serviços Executados · ${indice}/${total}`));
  out.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { after: 200 },
      children: [new TextRun({ text: servico.titulo, bold: true, color: INK, size: 30, font: HEAD_FONT })],
    })
  );

  const meta: Array<[string, string]> = [
    ["OS", servico.numeroOS],
    ["Tempo Total", servico.tempoGasto],
    ["Equipamento", servico.equipamento],
    ["Local", servico.area],
    ["Área Responsável", `${servico.equipe} · ${servico.responsavel}`],
    ["Status", statusLabel(servico.status)],
  ];
  const metaRows = chunk(meta, 2).map(
    (par) =>
      new TableRow({
        children: par.map(
          ([label, value]) =>
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              shading: { type: ShadingType.SOLID, color: SLATE_LIGHT, fill: SLATE_LIGHT },
              margins: { top: 100, bottom: 100, left: 160, right: 160 },
              borders: { top: { style: BorderStyle.SINGLE, size: 4, color: BORDER }, bottom: { style: BorderStyle.SINGLE, size: 4, color: BORDER }, left: { style: BorderStyle.SINGLE, size: 4, color: BORDER }, right: { style: BorderStyle.SINGLE, size: 4, color: BORDER } },
              children: [labelText(label), new Paragraph({ children: [new TextRun({ text: value, bold: true, size: 20, color: INK, font: BODY_FONT })] })],
            })
        ),
      })
  );
  out.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: metaRows }));
  out.push(new Paragraph({ spacing: { after: 160 }, children: [] }));

  const textos: Array<[string, string]> = [
    ["Problema Identificado", servico.problemaIdentificado],
    ["O Que Foi Feito", servico.servicoExecutado],
    ["Resultado", servico.resultado],
  ];
  textos.forEach(([label, value]) => {
    out.push(new Paragraph({ spacing: { before: 120 }, children: [new TextRun({ text: label.toUpperCase(), bold: true, color: BRAND, size: 16, font: BODY_FONT, characterSpacing: 10 })] }));
    out.push(bodyText(value, { color: SLATE, size: 19 }));
  });

  const fotos = [
    ...(servico.fotoAntes && servico.fotoAntes !== NO_PHOTO_PLACEHOLDER ? [{ url: servico.fotoAntes, label: "Antes" }] : []),
    ...(servico.fotoDurante ? [{ url: servico.fotoDurante, label: "Durante" }] : []),
    ...(servico.fotoDepois && servico.fotoDepois !== NO_PHOTO_PLACEHOLDER ? [{ url: servico.fotoDepois, label: "Depois" }] : []),
  ];
  if (fotos.length > 0) {
    const cells: TableCell[] = [];
    for (const foto of fotos) {
      const buf = await fetchImage(foto.url, origin);
      if (!buf) continue;
      cells.push(
        new TableCell({
          width: { size: Math.floor(100 / fotos.length), type: WidthType.PERCENTAGE },
          borders: noBorders,
          margins: { top: 120, left: 60, right: 60 },
          children: [
            new Paragraph({ alignment: AlignmentType.CENTER, children: [new ImageRun({ data: buf, transformation: { width: 240, height: 170 }, type: "jpg" })] }),
            fotos.length > 1 ? new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: foto.label, bold: true, size: 15, color: SLATE, font: BODY_FONT })] }) : new Paragraph(""),
          ],
        })
      );
    }
    if (cells.length > 0) out.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: noBorders, rows: [new TableRow({ children: cells })] }));
  }

  return out;
}

async function buildGaleria(data: ParadaCompleta, origin: string): Promise<(Paragraph | Table)[]> {
  const out: (Paragraph | Table)[] = [eyebrow("Registro Fotográfico"), pageTitle("Galeria Antes, Durante & Depois")];
  const linhas = chunk(data.fotos, 4);
  for (const linha of linhas) {
    const cells: TableCell[] = [];
    for (const foto of linha) {
      const buf = await fetchImage(foto.url, origin);
      cells.push(
        new TableCell({
          width: { size: 25, type: WidthType.PERCENTAGE },
          borders: noBorders,
          margins: { top: 60, bottom: 60, left: 60, right: 60 },
          children: buf
            ? [
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new ImageRun({ data: buf, transformation: { width: 130, height: 130 }, type: "jpg" })] }),
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: foto.servico, size: 13, color: SLATE, font: BODY_FONT })] }),
              ]
            : [new Paragraph("")],
        })
      );
    }
    while (cells.length < 4) cells.push(new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, borders: noBorders, children: [new Paragraph("")] }));
    out.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: noBorders, rows: [new TableRow({ children: cells })] }));
  }
  return out;
}

function barRow(label: string, valor: number, max: number, color: string): TableRow {
  const pct = max > 0 ? Math.max(4, Math.round((valor / max) * 100)) : 4;
  return new TableRow({
    children: [
      new TableCell({ width: { size: 22, type: WidthType.PERCENTAGE }, borders: noBorders, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ children: [new TextRun({ text: label, size: 18, color: INK, font: BODY_FONT })] })] }),
      new TableCell({
        width: { size: 68, type: WidthType.PERCENTAGE },
        borders: noBorders,
        margins: { top: 30, bottom: 30 },
        children: [
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: noBorders,
            rows: [
              new TableRow({
                children: [
                  new TableCell({ width: { size: pct, type: WidthType.PERCENTAGE }, shading: { type: ShadingType.SOLID, color, fill: color }, borders: noBorders, children: [new Paragraph("")] }),
                  new TableCell({ width: { size: 100 - pct, type: WidthType.PERCENTAGE }, borders: noBorders, children: [new Paragraph("")] }),
                ],
              }),
            ],
          }),
        ],
      }),
      new TableCell({ width: { size: 10, type: WidthType.PERCENTAGE }, borders: noBorders, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: String(valor), bold: true, size: 18, color: INK, font: BODY_FONT })] })] }),
    ],
  });
}

function buildGraficos(data: ParadaCompleta): (Paragraph | Table)[] {
  const { graficos } = data;
  const maxEquipe = Math.max(1, ...graficos.osPorEquipe.map((d) => d.quantidade));
  const maxHoras = Math.max(1, ...graficos.horasPorSetor.map((d) => d.horas));
  const maxCategoria = Math.max(1, ...graficos.distribuicaoServicos.map((d) => d.valor));

  const out: (Paragraph | Table)[] = [eyebrow("Indicadores Visuais"), pageTitle("Gráficos de Desempenho")];

  out.push(new Paragraph({ spacing: { before: 120, after: 40 }, children: [new TextRun({ text: "OS por Equipe", bold: true, size: 20, color: INK, font: BODY_FONT })] }));
  out.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: noBorders, rows: graficos.osPorEquipe.map((d) => barRow(d.equipe, d.quantidade, maxEquipe, BRAND)) }));

  out.push(new Paragraph({ spacing: { before: 260, after: 40 }, children: [new TextRun({ text: "Horas por Setor", bold: true, size: 20, color: INK, font: BODY_FONT })] }));
  out.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: noBorders, rows: graficos.horasPorSetor.map((d) => barRow(d.setor, d.horas, maxHoras, "7FABE5")) }));

  out.push(new Paragraph({ spacing: { before: 260, after: 40 }, children: [new TextRun({ text: "Distribuição dos Serviços", bold: true, size: 20, color: INK, font: BODY_FONT })] }));
  out.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: noBorders, rows: graficos.distribuicaoServicos.map((d) => barRow(d.categoria, d.valor, maxCategoria, "B7CFF0")) }));

  out.push(
    new Paragraph({
      spacing: { before: 320 },
      alignment: AlignmentType.CENTER,
      shading: { type: ShadingType.SOLID, color: NAVY, fill: NAVY },
      children: [new TextRun({ text: `PERCENTUAL CONCLUÍDO: ${graficos.percentualConcluido}%`, bold: true, color: WHITE, size: 26, font: HEAD_FONT })],
    })
  );

  return out;
}

function buildGraficosServico(data: ParadaCompleta): (Paragraph | Table)[] {
  const { graficos } = data;
  const maxHorasServico = Math.max(1, ...graficos.horasPorServico.map((d) => d.horas));
  const out: (Paragraph | Table)[] = [eyebrow("Indicadores Visuais"), pageTitle("Horas por Serviço")];
  out.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: noBorders, rows: graficos.horasPorServico.map((d) => barRow(d.servico, d.horas, maxHorasServico, "B7CFF0")) }));
  return out;
}

function buildCaminhoCritico(data: ParadaCompleta): (Paragraph | Table)[] {
  const header = ["Serviço", "Início Planej.", "Fim Planej.", "Início Real", "Fim Real", "Diferença", "Responsável", "Status"];
  const headerRow = new TableRow({
    tableHeader: true,
    children: header.map(
      (h) =>
        new TableCell({
          shading: { type: ShadingType.SOLID, color: INK, fill: INK },
          margins: { top: 80, bottom: 80, left: 100, right: 100 },
          children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: WHITE, size: 15, font: BODY_FONT })] })],
        })
    ),
  });
  const rows = [
    headerRow,
    ...data.caminhoCritico.map((item, i) => {
      const bg = i % 2 === 1 ? SLATE_LIGHT : WHITE;
      const diffColor = item.diferencaMin > 60 ? DANGER : item.diferencaMin > 0 ? WARNING : SUCCESS;
      const cells = [
        item.servico,
        item.inicioPlanejado,
        item.fimPlanejado,
        item.inicioReal,
        item.fimReal,
        item.diferencaMin === 0 ? "No prazo" : `+${item.diferencaMin} min`,
        item.responsavel,
        statusLabel(item.status),
      ];
      return new TableRow({
        children: cells.map(
          (text, ci) =>
            new TableCell({
              shading: { type: ShadingType.SOLID, color: bg, fill: bg },
              margins: { top: 60, bottom: 60, left: 100, right: 100 },
              children: [new Paragraph({ children: [new TextRun({ text, size: 15, color: ci === 5 ? diffColor : INK, bold: ci === 0 || ci === 5, font: ci >= 1 && ci <= 4 ? "Consolas" : BODY_FONT })] })],
            })
        ),
      });
    }),
  ];
  return [eyebrow("Cronograma Crítico"), pageTitle("Caminho Crítico"), new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows })];
}

function buildResultado(data: ParadaCompleta): (Paragraph | Table)[] {
  const { resultadoFinal: resultado, pendencias } = data;
  const titulo =
    resultado.selo === "concluida"
      ? "PARADA CONCLUÍDA COM SUCESSO"
      : resultado.selo === "ressalvas"
        ? "PARADA CONCLUÍDA COM RESSALVAS"
        : "PARADA EM ANDAMENTO";
  const seloColor = resultado.selo === "concluida" ? SUCCESS : resultado.selo === "ressalvas" ? WARNING : BRAND;

  const out: (Paragraph | Table)[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 60 },
      children: [new TextRun({ text: "RESULTADO FINAL", bold: true, color: BRAND, size: 18, font: BODY_FONT, characterSpacing: 20 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [new TextRun({ text: titulo, bold: true, color: seloColor, size: 32, font: HEAD_FONT })],
    }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 300 }, children: [new TextRun({ text: resultado.resumo, color: SLATE, size: 20, italics: true, font: BODY_FONT })] }),
  ];

  const indicadores: Array<[string, string]> = [
    ["Tempo Planejado", `${resultado.tempoPlanejadoHoras}h`],
    ["Tempo Realizado", `${resultado.tempoRealizadoHoras}h`],
    ["Eficiência", `${resultado.eficiencia}%`],
    ["Disponibilidade", `${resultado.disponibilidade}%`],
    ["Pendências", String(resultado.pendenciasAbertas)],
  ];
  out.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [new TableRow({ children: indicadores.map(([l, v]) => kpiCell(l, v)) })] }));

  if (pendencias.length > 0) {
    out.push(new Paragraph({ spacing: { before: 320, after: 80 }, children: [new TextRun({ text: "O QUE NÃO FOI FEITO", bold: true, color: WARNING, size: 18, font: BODY_FONT, characterSpacing: 10 })] }));
    pendencias.forEach((p) => {
      out.push(
        new Paragraph({
          spacing: { after: 60 },
          children: [
            new TextRun({ text: `${p.item} — `, bold: true, size: 19, color: INK, font: BODY_FONT }),
            new TextRun({ text: p.motivo, size: 19, color: SLATE, font: BODY_FONT }),
          ],
        })
      );
    });
  }

  return out;
}
