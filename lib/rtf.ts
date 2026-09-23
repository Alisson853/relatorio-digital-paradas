// Primitivas RTF compartilhadas — extraídas de app/api/export/rtf/[id]/route.ts
// (o export completo de uma parada) pra serem reaproveitadas por qualquer
// outro export RTF do app (ex: o QR code de uma máquina), sem duplicar a
// mecânica de parágrafo/tabela/imagem/link em RTF puro.

export const PAGE_WIDTH_TWIPS = 9026; // A4, margem de 1" de cada lado

// Paleta como índice na tabela de cores do RTF (ordem importa).
export const COLORS = ["auto", "101828", "1B4D99", "64749A", "0F8A5F", "B8760F", "C23A2F", "FFFFFF", "0A1E3F", "F7F9FC", "DBE2EE"] as const;
export const [, C_INK, C_BRAND, C_SLATE, C_SUCCESS, C_WARNING, C_DANGER, C_WHITE, C_NAVY, C_SLATE_LIGHT, C_BORDER] = COLORS.map((_, i) => i);

export function esc(texto: string): string {
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

export interface RunOpts {
  bold?: boolean;
  italic?: boolean;
  size?: number; // em pt
  color?: number;
  bg?: number;
  font?: 0 | 1 | 2; // 0=display, 1=corpo, 2=mono
  caps?: boolean;
}

export function run(texto: string, opts: RunOpts = {}): string {
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

export interface ParaOpts {
  align?: "l" | "c" | "r";
  spaceBefore?: number;
  spaceAfter?: number;
  borderBottom?: boolean;
}

function pardPreambulo(paraOpts: ParaOpts): string {
  const align = paraOpts.align === "c" ? "\\qc" : paraOpts.align === "r" ? "\\qr" : "\\ql";
  const sb = paraOpts.spaceBefore !== undefined ? `\\sb${paraOpts.spaceBefore}` : "";
  const sa = paraOpts.spaceAfter !== undefined ? `\\sa${paraOpts.spaceAfter}` : "\\sa120";
  const border = paraOpts.borderBottom ? `\\brdrb\\brdrs\\brdrw10\\brsp40\\brdrcf${C_BORDER}` : "";
  return `\\pard${align}${sb}${sa}${border}`;
}

export function para(texto: string, runOpts: RunOpts = {}, paraOpts: ParaOpts = {}): string {
  return `${pardPreambulo(paraOpts)} ${run(texto, runOpts)}\\par\n`;
}

// Pra conteúdo que já é markup RTF pronto (ex: um campo HYPERLINK) — nunca
// passar texto solto aqui, ele não passa pelo esc().
export function paraRaw(rtf: string, paraOpts: ParaOpts = {}): string {
  return `${pardPreambulo(paraOpts)} ${rtf}\\par\n`;
}

export interface Celula {
  texto: string;
  run?: RunOpts;
  bg?: number;
  pict?: { hex: string; width: number; height: number };
  legenda?: string;
}

// Quebra o hex em linhas — evita uma única linha gigantesca, que alguns
// leitores de RTF truncam ou travam ao processar.
export function pictBlock(foto: { hex: string; width: number; height: number }): string {
  const goalW = Math.round(foto.width * 15); // ~96dpi -> twips
  const goalH = Math.round(foto.height * 15);
  const linhasHex: string[] = [];
  for (let i = 0; i < foto.hex.length; i += 128) linhasHex.push(foto.hex.slice(i, i + 128));
  return `{\\pict\\jpegblip\\picw${foto.width}\\pich${foto.height}\\picwgoal${goalW}\\pichgoal${goalH}\n${linhasHex.join("\n")}\n}`;
}

// Uma tabela simples: cada linha é um array de células, larguras em frações (somam 1).
export function tabela(linhas: Celula[][], larguras: number[]): string {
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

export function eyebrow(texto: string): string {
  return para(texto, { bold: true, size: 9, color: C_BRAND, font: 1, caps: true }, { spaceBefore: 240, spaceAfter: 40 });
}

export function pageTitle(texto: string): string {
  return para(texto, { bold: true, size: 20, color: C_NAVY, font: 0 }, { spaceAfter: 160 });
}

export function pageBreak(): string {
  return "\\page\n";
}

// Link clicável de verdade (campo HYPERLINK do RTF) — útil quando o sistema
// que recebe o RTF (Mantec) descarta imagens e só o QR não bastaria.
export function hyperlink(url: string, texto: string): string {
  return `{\\field{\\*\\fldinst HYPERLINK "${url}"}{\\fldrslt ${run(texto, { color: C_BRAND, size: 8, font: 2 })}}}`;
}

export function fontTable(): string {
  return "{\\fonttbl{\\f0\\froman Cambria;}{\\f1\\fswiss Calibri;}{\\f2\\fmodern Consolas;}}";
}

export function colorTable(): string {
  return "{\\colortbl;" + COLORS.slice(1).map((hex) => `\\red${parseInt(hex.slice(0, 2), 16)}\\green${parseInt(hex.slice(2, 4), 16)}\\blue${parseInt(hex.slice(4, 6), 16)};`).join("") + "}";
}

// Envelope \rtf1 completo — cabeçalho + tabelas de fonte/cor + margens.
export function envelopeRtf(body: string): string {
  return `{\\rtf1\\ansi\\ansicpg1252\\deff1\\deflang1046\n${fontTable()}\n${colorTable()}\n\\margl1440\\margr1440\\margt1440\\margb1440\n${body}}`;
}
