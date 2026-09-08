"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { login, logout, sessaoAtiva } from "./actions/auth";
import { isEditorUnlocked, limparDicaEditor } from "./editor-auth";

// isEditorUnlocked() lê um cookie — um dado externo ao React — então em vez de
// copiar esse valor pra um useState via efeito (o que gera um primeiro render
// "errado" seguido de uma correção), useSyncExternalStore já resolve isso do
// jeito certo: usa getServerSnapshot no servidor e na primeira passada do
// cliente (sem mismatch de hidratação), e resincroniza sozinho quando o evento
// abaixo dispara.
const EVENTO_MUDANCA = "maintops:editor-mode-changed";

function notificarMudanca(): void {
  window.dispatchEvent(new Event(EVENTO_MUDANCA));
}

function subscribe(callback: () => void): () => void {
  // O evento próprio é pra esta aba; "storage" continua ouvido porque outras
  // abas do mesmo app disparam a mudança de sessão e a tela deve acompanhar.
  window.addEventListener(EVENTO_MUDANCA, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENTO_MUDANCA, callback);
    window.removeEventListener("storage", callback);
  };
}

function getServerSnapshot(): boolean {
  return false;
}

export function useEditorMode() {
  const isEditor = useSyncExternalStore(subscribe, isEditorUnlocked, getServerSnapshot);

  // O cookie de UI é só uma dica: ele pode estar de pé enquanto a sessão de
  // verdade (o cookie httpOnly assinado) já venceu ou foi revogada. Sem esta
  // confirmação no servidor, a tela seguiria mostrando os controles de edição
  // e toda ação falharia com "Não autorizado" sem explicação.
  useEffect(() => {
    if (!isEditor) return;
    sessaoAtiva().then((valida) => {
      if (!valida) {
        limparDicaEditor();
        notificarMudanca();
      }
    });
  }, [isEditor]);

  // A senha viaja até o servidor uma única vez, aqui. A partir daí quem
  // autentica é o cookie httpOnly que o login abriu — o cliente não guarda
  // nem reenvia nada.
  const unlock = useCallback(async (senha: string, armadilha?: string) => {
    const resultado = await login(senha, armadilha);
    if (resultado.ok) notificarMudanca();
    return resultado;
  }, []);

  const lock = useCallback(async () => {
    limparDicaEditor();
    notificarMudanca();
    await logout();
  }, []);

  return { ready: true, isEditor, unlock, lock };
}
