// Sessão do editor, do lado do servidor: confere a senha, abre/fecha o cookie
// e é a única fonte de verdade sobre "quem está pedindo é editor?".
//
// Duas mudanças em relação ao desenho anterior (token no localStorage):
//
// 1. O token agora vive num cookie httpOnly. localStorage é legível por
//    qualquer JavaScript da página — uma única falha de XSS, ou uma extensão
//    curiosa, entregava a sessão inteira. Cookie httpOnly o navegador não deixa
//    o JS ler, e ele viaja sozinho em toda requisição, sem o cliente precisar
//    carregar o segredo pra lá e pra cá.
// 2. A senha não fica mais em texto puro na variável de ambiente: EDITOR_PASSWORD_HASH
//    guarda um derivado scrypt (com salt). Quem abrir o painel da Vercel, um
//    backup de env ou um log não lê mais a senha que as pessoas digitam — e
//    como muita gente reaproveita senha, isso vazava mais do que este app.
import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { COOKIE_SESSAO, COOKIE_UI } from "./cookies";
import { criarToken, tokenValido, VALIDADE_MS } from "./token";

const CUSTO_SCRYPT = { N: 16384, r: 8, p: 1 };
const TAMANHO_CHAVE = 64;

// promisify(scrypt) perde a sobrecarga que aceita o objeto de custo — os tipos
// do Node so expoem a forma de 3 argumentos. Envolver a mao mantem N/r/p, que
// e justamente o que torna a derivacao cara o bastante pra valer a pena.
function scrypt(senha: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(senha, salt, TAMANHO_CHAVE, CUSTO_SCRYPT, (erro, derivada) => {
      if (erro) reject(erro);
      else resolve(derivada);
    });
  });
}

export function gerarHashSenha(senha: string): Promise<string> {
  const salt = randomBytes(16);
  return scrypt(senha, salt).then((derivada) => `scrypt$${salt.toString("hex")}$${derivada.toString("hex")}`);
}

function comparaBuffers(a: Buffer, b: Buffer): boolean {
  // timingSafeEqual explode se os tamanhos diferem — e o próprio tamanho já é
  // informação. Normaliza os dois com SHA-256 antes: sempre 32 bytes, e a
  // comparação segue em tempo constante.
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

async function conferirSenha(senha: string): Promise<boolean> {
  const hash = process.env.EDITOR_PASSWORD_HASH;
  if (hash) {
    const [algoritmo, saltHex, esperadoHex] = hash.split("$");
    if (algoritmo !== "scrypt" || !saltHex || !esperadoHex) return false;
    const derivada = await scrypt(senha, Buffer.from(saltHex, "hex"));
    return comparaBuffers(derivada, Buffer.from(esperadoHex, "hex"));
  }

  // Compatibilidade: deploy que ainda não migrou pro hash. Continua funcionando,
  // mas é o caminho que queremos aposentar (veja scripts/gerar-hash-senha.mjs).
  const pura = process.env.EDITOR_PASSWORD || "";
  if (!pura) return false;
  return comparaBuffers(Buffer.from(senha), Buffer.from(pura));
}

export async function abrirSessao(senha: string): Promise<boolean> {
  if (!(await conferirSenha(senha))) return false;

  const token = await criarToken();
  const expira = new Date(Date.now() + VALIDADE_MS);
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_SESSAO, token, {
    httpOnly: true,
    // Em produção o cookie só trafega em HTTPS. Em dev (http://localhost) o
    // navegador recusaria um cookie Secure, então a flag acompanha o ambiente.
    secure: process.env.NODE_ENV === "production",
    // Lax, não Strict, e a diferença aqui é prática. Toda escrita deste app é
    // uma Server Action, que é POST — e Lax já não manda o cookie em POST vindo
    // de outro site, então a proteção contra CSRF é a mesma nos dois casos.
    // O que Lax permite a mais é a navegação GET de nível superior: o técnico
    // que abre o link do relatório pelo leitor de QR code ou pelo WhatsApp
    // chega logado. Com Strict, ele chegaria deslogado nesse primeiro clique e
    // só voltaria ao normal depois de navegar dentro do site — bem no cenário
    // de campo que a Captura Rápida existe pra atender.
    sameSite: "lax",
    path: "/",
    expires: expira,
  });

  cookieStore.set(COOKIE_UI, "1", {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expira,
  });

  return true;
}

export async function fecharSessao(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_SESSAO);
  cookieStore.delete(COOKIE_UI);
}

// É isto que toda ação de escrita chama. Não recebe nada do cliente de
// propósito: lê o cookie direto da requisição, então não existe "passar o
// token certo" — ou o navegador tem a sessão, ou não tem.
export async function ehEditor(): Promise<boolean> {
  const cookieStore = await cookies();
  return tokenValido(cookieStore.get(COOKIE_SESSAO)?.value);
}
