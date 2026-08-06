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
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(atuais));
}

export function deleteCustomParada(id: string): void {
  if (typeof window === "undefined") return;
  const atuais = getCustomParadas().filter((p) => p.resumo.id !== id);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(atuais));
}

export function getCustomParadasResumo(): ParadaResumo[] {
  return getCustomParadas().map((p) => p.resumo);
}

export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
