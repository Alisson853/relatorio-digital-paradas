const PREFIX = "maintops:rascunho:";

export function saveDraft(key: string, data: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(data));
  } catch {
    // rascunho é best-effort — falha de quota não deve travar o usuário
  }
}

export function getDraft<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(PREFIX + key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function clearDraft(key: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PREFIX + key);
}
