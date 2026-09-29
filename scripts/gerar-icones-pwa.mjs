// Script descartável: gera os ícones do manifest PWA a partir do ícone
// já existente (app/icon.png, o mesmo mostrado hoje como favicon). Roda uma
// vez; os arquivos gerados ficam versionados em public/pwa/, o script não
// precisa rodar de novo a menos que o ícone-fonte mude.
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

await mkdir("public/pwa", { recursive: true });

const fonte = sharp("app/icon.png");

// Ícones "any": o logo ocupando quase todo o quadro, como já é hoje.
await sharp("app/icon.png").resize(192, 192).png().toFile("public/pwa/icon-192.png");
await sharp("app/icon.png").resize(512, 512).png().toFile("public/pwa/icon-512.png");

// apple-icon.png é uma convenção própria do Next (separada de icon.png) —
// sem ela, "Adicionar à Tela de Início" no iOS não usa esse ícone. 180x180
// é o tamanho de referência da Apple; fundo opaco porque o iOS não lida bem
// com transparência nesse ícone (mostra preto onde deveria ser vazio).
const conteudoApple = await fonte.clone().resize(146, 146).toBuffer();
await sharp({ create: { width: 180, height: 180, channels: 4, background: "#ffffff" } })
  .composite([{ input: conteudoApple, left: (180 - 146) / 2, top: (180 - 146) / 2 }])
  .png()
  .toFile("app/apple-icon.png");

// Ícone "maskable": o Android recorta esse ícone em formas variadas (círculo,
// squircle...) — sem uma margem de segurança generosa ao redor do desenho,
// pontas do logo saem cortadas dependendo do launcher. Convenção: conteúdo
// dentro de ~65-70% do quadro, fundo sólido (não transparente) porque a
// máscara do sistema não sabe compor sobre transparência de forma previsível.
const conteudo = await fonte.clone().resize(320, 320).toBuffer();
await sharp({ create: { width: 512, height: 512, channels: 4, background: "#ffffff" } })
  .composite([{ input: conteudo, left: (512 - 320) / 2, top: (512 - 320) / 2 }])
  .png()
  .toFile("public/pwa/icon-maskable-512.png");

console.log("Ícones gerados em public/pwa/");
