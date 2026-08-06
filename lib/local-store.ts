import type { ParadaCompleta, ParadaResumo } from "./types";

const STORAGE_KEY = "maintops:paradas-customizadas";

function safeParse(raw: string | null): ParadaCompleta[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getCustomParadas(): ParadaCompleta[] {
  if (typeof window === "undefined") return [];
  return safeParse(window.localStorage.getItem(STORAGE_KEY));
}

export function getCustomParadaById(id: string): ParadaCompleta | null {
  return getCustomParadas().find((p) => p.resumo.id === id) ?? null;
}

export function saveCustomParada(data: ParadaCompleta): void {
  if (typeof window === "undefined") return;
  const atuais = getCustomParadas().filter((p) => p.resumo.id !== data.resumo.id);
  atuais.unshift(data);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(atuais));
  } catch {
    throw new Error(
      "Não foi possível salvar — o espaço de armazenamento do navegador está cheio. Tente remover fotos ou excluir relatórios antigos."
    );
  }
}

export function deleteCustomParada(id: string): void {
  if (typeof window === "undefined") return;
  const atuais = getCustomParadas().filter((p) => p.resumo.id !== id);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(atuais));
}

export function getCustomParadasResumo(): ParadaResumo[] {
  return getCustomParadas().map((p) => p.resumo);
}

// Quota real varia por navegador (5–10MB); usamos 5MB como referência conservadora para o aviso.
export const STORAGE_QUOTA_REFERENCIA_BYTES = 5 * 1024 * 1024;

export function getStorageUsageBytes(): number {
  if (typeof window === "undefined") return 0;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return raw ? raw.length * 2 : 0;
}

export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function triggerJsonDownload(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function downloadParadaJson(data: ParadaCompleta): void {
  triggerJsonDownload(`relatorio-${data.resumo.id}.json`, data);
}

export function downloadAllParadasJson(): void {
  const atuais = getCustomParadas();
  triggerJsonDownload(`relatorios-santher-backup-${new Date().toISOString().slice(0, 10)}.json`, atuais);
}

function isValidParadaCompleta(value: unknown): value is ParadaCompleta {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  const resumo = v.resumo as Record<string, unknown> | undefined;
  return !!resumo && typeof resumo.id === "string" && typeof resumo.nome === "string";
}

export async function importParadasFromFile(file: File): Promise<{ importados: number; ignorados: number }> {
  const text = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Arquivo inválido — não foi possível ler o JSON.");
  }

  const candidatos = Array.isArray(parsed) ? parsed : [parsed];
  let importados = 0;
  let ignorados = 0;

  for (const candidato of candidatos) {
    if (isValidParadaCompleta(candidato)) {
      saveCustomParada(candidato);
      importados++;
    } else {
      ignorados++;
    }
  }

  return { importados, ignorados };
}
