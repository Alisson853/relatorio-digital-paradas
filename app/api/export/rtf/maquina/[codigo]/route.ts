import { NextRequest } from "next/server";
import sharp from "sharp";
import imageSize from "image-size";
import { ehEditor } from "@/lib/auth/session";
import { SITE_URL, gerarQrCodeBuffer } from "@/lib/qrcode";
import { C_BRAND, C_NAVY, C_SLATE, envelopeRtf, hyperlink, para, paraRaw, run, tabela } from "@/lib/rtf";

export const dynamic = "force-dynamic";

// RTF de uma página só, com o QR code que abre o dashboard já filtrado numa
// máquina (?maquina=MP09) — pensado pra colar num aviso ou ficha física
// perto da própria máquina, mesmo mecanismo (e mesmo cuidado com o Mantec
// descartando imagem no paste, coberto pelo hyperlink de texto) do export
// RTF de uma parada específica.

function sanearCodigo(bruto: string): string {
  return bruto
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 20);
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ codigo: string }> }) {
  // Mesmo raciocínio do export por parada: o proxy.ts já barra /api/export
  // sem sessão como checagem de borda, mas a autorização de verdade mora
  // aqui dentro da rota.
  if (!(await ehEditor())) {
    return new Response("Não autorizado.", { status: 401 });
  }

  const { codigo: codigoBruto } = await params;
  const codigo = sanearCodigo(decodeURIComponent(codigoBruto));
  if (!codigo) return new Response("Código de máquina inválido.", { status: 400 });

  const url = `${SITE_URL}/?maquina=${codigo}`;

  // gerarQrCodeBuffer devolve PNG, mas o \pict do RTF é montado como
  // \jpegblip (ver lib/rtf.ts) — reconverte pro mesmo formato que o bloco
  // promete, senão um leitor de RTF rígido trava no primeiro \pict.
  const qrPng = await gerarQrCodeBuffer(url, 260).catch(() => null);
  const qr = qrPng ? await sharp(qrPng).flatten({ background: "#ffffff" }).jpeg({ quality: 92 }).toBuffer() : null;
  if (!qr) return new Response("Não foi possível gerar o QR code.", { status: 500 });

  const dims = imageSize(qr);
  if (!dims.width || !dims.height) return new Response("Não foi possível gerar o QR code.", { status: 500 });

  let body = "";
  body += para("RELATÓRIO DIGITAL DE PARADA", { bold: true, color: C_BRAND, size: 9, font: 1, caps: true }, { align: "c", spaceBefore: 200, spaceAfter: 40 });
  body += para(codigo, { bold: true, color: C_NAVY, size: 32, font: 0 }, { align: "c", spaceAfter: 160 });
  body += tabela([[{ texto: "", pict: { hex: qr.toString("hex"), width: dims.width, height: dims.height } }]], [1]);
  body += paraRaw(`${run("Aponte a câmera pra ver as paradas dessa máquina: ", { size: 9, color: C_SLATE, font: 1 })}${hyperlink(url, url)}`, {
    align: "c",
    spaceBefore: 160,
  });
  body += para(`OS que já foram feitas, o que está em andamento e o histórico de pendências de ${codigo}.`, { color: C_SLATE, size: 9, italic: true, font: 1 }, {
    align: "c",
    spaceBefore: 40,
  });

  const rtf = envelopeRtf(body);
  const nomeArquivo = `paradas-${codigo.toLowerCase()}.rtf`;

  return new Response(rtf, {
    headers: {
      "Content-Type": "application/rtf; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nomeArquivo}"`,
    },
  });
}
