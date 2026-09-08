"use server";

import { abrirSessao, ehEditor, fecharSessao } from "@/lib/auth/session";
import { consumirLimite, identificarRequisitante, limiteExcedidoMsg } from "@/lib/rate-limit";

// Porta de entrada do modo editor. Só existem três operações aqui: entrar,
// sair e perguntar se a sessão ainda vale. A senha atravessa a rede uma única
// vez, no login; do login em diante quem autentica é o cookie httpOnly aberto
// por abrirSessao() — o cliente não guarda nem reenvia segredo nenhum.

export interface ResultadoLogin {
  ok: boolean;
  erro?: string;
}

export async function login(senha: string, armadilha?: string): Promise<ResultadoLogin> {
  // Campo-armadilha (honeypot): fica escondido no formulário, invisível e fora
  // da ordem de tabulação, então uma pessoa nunca o preenche. Script que varre
  // a página e preenche todo input preenche. Recusa direto, sem nem consultar
  // a senha, e sem dizer o motivo — quem escreveu o bot não descobre por que
  // parou de funcionar.
  if (armadilha) return { ok: false, erro: "Senha incorreta." };

  const ip = await identificarRequisitante();

  // 5 tentativas a cada 5 minutos por IP. Como o contador agora vive no banco,
  // esse teto vale somando todas as instâncias — não é mais contornável
  // insistindo até cair numa instância recém-criada.
  const limite = await consumirLimite(`login:${ip}`, 5, 5 * 60);
  if (!limite.permitido) return { ok: false, erro: limiteExcedidoMsg() };

  const aberta = await abrirSessao(senha);
  // Mensagem única pro erro: não distingue "senha errada" de "sem senha
  // configurada no servidor", pra não confirmar nada a quem está sondando.
  if (!aberta) return { ok: false, erro: "Senha incorreta." };

  return { ok: true };
}

export async function logout(): Promise<void> {
  await fecharSessao();
}

// A tela usa isso pra confirmar que a sessão ainda está de pé (o cookie
// httpOnly não pode ser lido pelo JS, então quem responde é o servidor).
export async function sessaoAtiva(): Promise<boolean> {
  return ehEditor();
}
