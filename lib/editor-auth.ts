// Lado do cliente do modo editor.
//
// Antes, este arquivo guardava o token da sessão no localStorage e cada ação
// reenviava esse valor pro servidor. Agora ele não guarda segredo nenhum: a
// sessão vive num cookie httpOnly, que o JavaScript da página não consegue ler
// e que o navegador manda sozinho em toda requisição. O que sobrou aqui é só a
// leitura de um cookie de enfeite, sem autoridade nenhuma, que diz à tela se
// deve desenhar os controles de edição.
//
// Vale insistir no ponto: mentir neste cookie não libera nada. Toda ação de
// escrita chama ehEditor() no servidor, que olha exclusivamente o cookie
// httpOnly assinado. Quem forçar "maintops_editor_ui=1" no console vê os
// botões aparecerem e recebe "Não autorizado." ao clicar em qualquer um.
const COOKIE_UI = "maintops_editor_ui";

export function isEditorUnlocked(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split("; ").some((c) => c === `${COOKIE_UI}=1`);
}

// Limpa a dica visual na hora, sem esperar a resposta do servidor — quem
// efetivamente encerra a sessão é a action logout(), que apaga o cookie
// httpOnly. Este aqui só evita a tela ficar mostrando modo editor no intervalo.
export function limparDicaEditor(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE_UI}=; Max-Age=0; Path=/; SameSite=Lax`;
}
