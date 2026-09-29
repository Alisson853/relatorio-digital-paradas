"use client";

import { useEffect, useState } from "react";

// Só o estado online/offline do navegador — nenhuma fila, nenhuma
// sincronização. A Captura Rápida já tem sua própria lógica de fila (foto e
// "não será feito" pendentes, em lib/offline-fotos.ts / lib/offline-nao-feito.ts)
// porque só ela precisa disso; este hook é o que falta pras OUTRAS telas
// (dashboard, histórico, /novo) ao menos avisarem "você está sem conexão",
// em vez de simplesmente falhar silenciosamente numa Server Action.
//
// Preparação pro Bloco D: quando a fila/sincronização completa existir para
// mais telas, o estado real de "sincronizando" pode entrar aqui — por ora,
// isso é só leitura de navigator.onLine.
export function useConectividade(): boolean {
  // Inicializador preguiçoso (roda no primeiro render, não num efeito depois
  // dele) — evita tanto o flash de "online" incorreto antes do efeito rodar
  // quanto um setState síncrono dentro de useEffect. No servidor (sem
  // navigator) assume online, que é inofensivo: o valor real chega no
  // primeiro render do cliente.
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));

  useEffect(() => {
    const marcarOnline = () => setOnline(true);
    const marcarOffline = () => setOnline(false);
    window.addEventListener("online", marcarOnline);
    window.addEventListener("offline", marcarOffline);
    return () => {
      window.removeEventListener("online", marcarOnline);
      window.removeEventListener("offline", marcarOffline);
    };
  }, []);

  return online;
}
