// HEIC/HEIF (formato padrão de foto do iPhone) não é decodificado pelo
// <canvas> de nenhum navegador — img.onerror dispara sem detalhe nenhum,
// e sem essa checagem o usuário só via "Não foi possível enviar essa
// imagem", sem saber o que fazer a respeito.
function pareceHeic(file: File): boolean {
  const alvo = `${file.name} ${file.type}`.toLowerCase();
  return /heic|heif/.test(alvo);
}

// Bloco F: nada aqui limitava o tamanho do arquivo ORIGINAL antes de
// carregá-lo inteiro — FileReader.readAsDataURL segura o arquivo inteiro (mais
// ~33% do base64) na memória, e o <canvas> decodifica a imagem nas dimensões
// REAIS antes de qualquer redimensionamento acontecer (uma foto de 48MP vira
// ~190MB de pixels crus só pra virar um JPEG de 1600px de largura no fim).
// Este projeto já teve problema de memória antes; uma foto fora do comum
// (arquivo trocado, câmera em modo de altíssima resolução) não pode travar a
// aba no celular em campo. 35MB é folgado o bastante pra qualquer JPEG normal
// de câmera de celular, mas barra o caso extremo antes de tocar em qualquer
// API de imagem.
export const LIMITE_BYTES_FOTO_ORIGEM = 35 * 1024 * 1024;

export function fotoOrigemMuitoGrande(tamanhoBytes: number): boolean {
  return tamanhoBytes > LIMITE_BYTES_FOTO_ORIGEM;
}

export function compressImageFile(file: File, maxWidth = 1600, quality = 0.8): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (fotoOrigemMuitoGrande(file.size)) {
      reject(new Error("Essa foto é grande demais para processar no aparelho (máximo 35 MB). Tente uma foto com resolução menor."));
      return;
    }
    if (pareceHeic(file)) {
      reject(
        new Error(
          'Essa foto está em formato HEIC (padrão do iPhone) e não dá pra abrir aqui. No iPhone, vá em Ajustes > Câmera > Formatos e escolha "Mais Compatível", ou envie a foto por WhatsApp/Fotos pra você mesmo antes (costuma converter pra JPEG).'
        )
      );
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new window.Image();
      img.onerror = () => reject(new Error("Não foi possível ler a imagem."));
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const width = Math.round(img.width * scale);
        const height = Math.round(img.height * scale);

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Não foi possível processar a imagem."));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error("Não foi possível comprimir a imagem."))),
          "image/jpeg",
          quality
        );
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export const NO_PHOTO_PLACEHOLDER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480">
  <rect width="640" height="480" fill="#eef1f7"/>
  <g fill="none" stroke="#b6c0d6" stroke-width="10" stroke-linecap="round" stroke-linejoin="round">
    <rect x="140" y="160" width="360" height="240" rx="18"/>
    <circle cx="320" cy="280" r="60"/>
    <path d="M220 160l24-40h152l24 40"/>
  </g>
  <text x="320" y="430" font-family="Arial, sans-serif" font-size="24" fill="#8b98b8" text-anchor="middle">Sem foto</text>
</svg>`);
