// Modo editor: a senha é validada no servidor (lib/actions/auth.ts) a cada ação
// de escrita — criar, editar, excluir e enviar fotos. O que fica salvo no
// navegador NÃO é a senha real: é um token assinado pelo servidor, com validade
// de 24h, devolvido depois de um login correto (veja lib/actions/auth.ts). Quem
// ler esse localStorage não descobre a senha — só um token que expira sozinho e
// não serve pra nada fora deste app. O flag de UI continua sendo só um filtro de
// visibilidade; a escrita em si é sempre revalidada no servidor com o token.
const SENHA_KEY = "maintops:editor-senha";
const STORAGE_KEY = "maintops:editor-unlocked";

export function isEditorUnlocked(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE_KEY) === "true";
}

export function getEditorSenha(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(SENHA_KEY) ?? "";
}

export function persistEditorUnlock(senha: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, "true");
  window.localStorage.setItem(SENHA_KEY, senha);
}

export function lockEditor(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.localStorage.removeItem(SENHA_KEY);
}
