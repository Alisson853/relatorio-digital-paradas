// Modo editor: a senha agora é validada no servidor (lib/actions/auth.ts) a cada
// ação de escrita — criar, editar, excluir e enviar fotos. O que fica no navegador
// é só a senha (para reenviá-la nas próximas ações) e um flag de UI, então isso
// continua sendo apenas um filtro de visibilidade para quem só precisa visualizar,
// não uma sessão autenticada — mas a escrita em si não pode mais ser forjada
// sem conhecer a senha, diferente do esquema anterior 100% client-side.
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
