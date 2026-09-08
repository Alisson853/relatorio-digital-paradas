// Assinatura e verificação do token de sessão do editor.
//
// Este módulo é deliberadamente "runtime-agnóstico": usa só Web Crypto
// (globalThis.crypto.subtle), que existe tanto no Node quanto no runtime Edge.
// Isso importa porque o proxy.ts (antigo middleware) roda no Edge e precisa
// conferir o token pra barrar rota — se aqui usasse node:crypto, o proxy
// quebraria no deploy. O hash da senha (scrypt) mora em session.ts, que é
// server-only e nunca é importado pelo proxy.

const CODIFICADOR = new TextEncoder();

// 24h. Depois disso o token não vale mais nem que a assinatura confira — a
// validade faz parte do payload assinado, então ninguém consegue esticar o
// prazo mexendo no cookie sem invalidar a assinatura.
export const VALIDADE_MS = 24 * 60 * 60 * 1000;

export function segredoDeAssinatura(): string {
  // SESSION_SECRET é o certo: uma chave dedicada, que não é a senha de ninguém.
  // Os fallbacks existem só pra não derrubar um deploy que ainda não tem essa
  // variável — mas o hash é preferido à senha pura, porque assim o segredo de
  // assinatura não é o mesmo texto que alguém digita no teclado.
  return process.env.SESSION_SECRET || process.env.EDITOR_PASSWORD_HASH || process.env.EDITOR_PASSWORD || "";
}

async function chaveHmac(segredo: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", CODIFICADOR.encode(segredo), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
}

function paraBase64Url(bytes: ArrayBuffer): string {
  const binario = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(binario).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function assinar(payload: string): Promise<string> {
  const segredo = segredoDeAssinatura();
  if (!segredo) return "";
  const assinatura = await crypto.subtle.sign("HMAC", await chaveHmac(segredo), CODIFICADOR.encode(payload));
  return paraBase64Url(assinatura);
}

// Comparação de tempo constante em cima de strings. crypto.subtle não expõe um
// timingSafeEqual, então é feito na mão: percorre SEMPRE o comprimento inteiro,
// acumulando as diferenças em OR, em vez de sair no primeiro byte diferente —
// sem isso dá pra descobrir a assinatura byte a byte medindo o tempo de resposta.
function comparaEmTempoConstante(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diferenca = 0;
  for (let i = 0; i < a.length; i++) diferenca |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diferenca === 0;
}

// Formato do token: "<expiraEm>.<nonce>.<assinatura de expiraEm.nonce>".
// O nonce é aleatório e entra na assinatura só pra que dois logins seguidos não
// gerem o mesmo token — sem ele, dois editores que entram no mesmo milissegundo
// carregariam cookies idênticos.
export async function criarToken(): Promise<string> {
  const expiraEm = Date.now() + VALIDADE_MS;
  const nonce = paraBase64Url(crypto.getRandomValues(new Uint8Array(12)).buffer as ArrayBuffer);
  const payload = `${expiraEm}.${nonce}`;
  return `${payload}.${await assinar(payload)}`;
}

export async function tokenValido(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  const partes = token.split(".");
  if (partes.length !== 3) return false;
  const [expiraEmStr, nonce, assinatura] = partes;

  const expiraEm = Number(expiraEmStr);
  if (!Number.isFinite(expiraEm) || Date.now() > expiraEm) return false;

  const esperada = await assinar(`${expiraEmStr}.${nonce}`);
  if (!esperada) return false;
  return comparaEmTempoConstante(assinatura, esperada);
}
