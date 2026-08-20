import QRCode from "qrcode";

// URL fixa de produção — usada pra montar o link que o QR code aponta
// (capa do PDF/RTF/PPTX/DOCX), já que o relatório sempre é gerado a partir
// dos dados salvos no banco, não importa de onde o export foi disparado.
export const SITE_URL = "https://relatorio-digital-paradas.vercel.app";

export function urlDaParada(id: string): string {
  return `${SITE_URL}/parada/${id}`;
}

export async function gerarQrCodeDataUrl(url: string, size = 240): Promise<string> {
  return QRCode.toDataURL(url, { width: size, margin: 1, color: { dark: "#0A1E3F", light: "#FFFFFFFF" } });
}

export async function gerarQrCodeBuffer(url: string, size = 240): Promise<Buffer> {
  return QRCode.toBuffer(url, { width: size, margin: 1, color: { dark: "#0A1E3F", light: "#FFFFFFFF" } });
}
