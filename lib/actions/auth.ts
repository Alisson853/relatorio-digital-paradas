"use server";

import { createHmac, timingSafeEqual } from "crypto";
import { headers } from "next/headers";

// Sessão de editor: em vez de guardar a senha real no navegador (localStorage
// em texto puro, legível por qualquer um com acesso ao aparelho ou a um
// devtools aberto), o login troca a senha por um token assinado com validade
// de 24h. É esse token que fica salvo e é reenviado nas ações — quem ler o
// localStorage não descobre a senha, só um token que expira sozinho.
const VALIDADE_MS = 24 * 60 * 60 * 1000;

function segredo(): string {
  // Reaproveita a própria senha de editor como chave de assinatura — evita
  // precisar de mais uma variável de ambiente só pra isso, e ela já é um
  // segredo que só o servidor conhece.
  return process.env.EDITOR_PASSWORD || "";
}

function assinar(payload: string): string {
  return createHmac("sha256", segredo()).update(payload).digest("base64url");
}

function compararSeguro(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  // timingSafeEqual exige buffers do mesmo tamanho — sem isso, dá pra inferir
  // o tamanho certo do token/senha por quantos bytes o servidor chegou a comparar.
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

// Tentativas de login por IP, só na memória do processo — reseta a cada cold
// start e não é compartilhado entre instâncias, então não segura um ataque
// distribuído de verdade. Mas encarece bastante tentar adivinhar a senha na
// mão ou com um script simples, que é a ameaça real aqui (não um botnet).
const tentativas = new Map<string, { contagem: number; desde: number }>();
const JANELA_MS = 5 * 60 * 1000;
const LIMITE_TENTATIVAS = 5;

async function ipDoRequisitante(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "desconhecido";
}

function estaBloqueado(ip: string): boolean {
  const registro = tentativas.get(ip);
  if (!registro) return false;
  if (Date.now() - registro.desde > JANELA_MS) {
    tentativas.delete(ip);
    return false;
  }
  return registro.contagem >= LIMITE_TENTATIVAS;
}

function registrarTentativaFalha(ip: string): void {
  const registro = tentativas.get(ip);
  if (!registro || Date.now() - registro.desde > JANELA_MS) {
    tentativas.set(ip, { contagem: 1, desde: Date.now() });
  } else {
    registro.contagem++;
  }
}

export async function login(senha: string): Promise<{ ok: boolean; token?: string; erro?: string }> {
  const ip = await ipDoRequisitante();
  if (estaBloqueado(ip)) {
    return { ok: false, erro: "Muitas tentativas. Aguarde alguns minutos e tente de novo." };
  }

  const esperado = process.env.EDITOR_PASSWORD || "";
  const correta = esperado.length > 0 && compararSeguro(senha, esperado);
  if (!correta) {
    registrarTentativaFalha(ip);
    return { ok: false, erro: "Senha incorreta." };
  }

  tentativas.delete(ip);
  const exp = Date.now() + VALIDADE_MS;
  const token = `${exp}.${assinar(String(exp))}`;
  return { ok: true, token };
}

// Todo o resto do app chama isso pra validar o que veio do navegador — desde
// a mudança pra sessão por token, o parâmetro "senha" nas outras actions na
// prática recebe esse token, não mais a senha real.
export async function verifyEditorPassword(token: string): Promise<boolean> {
  const [expStr, assinatura] = token.split(".");
  if (!expStr || !assinatura) return false;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || Date.now() > exp) return false;
  return compararSeguro(assinatura, assinar(expStr));
}
