export function fileToCompressedDataUrl(file: File, maxWidth = 900, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
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
          resolve(reader.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
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
