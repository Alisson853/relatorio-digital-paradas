"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { login, verifyEditorPassword } from "./actions/auth";
import { getEditorSenha, isEditorUnlocked, lockEditor, persistEditorUnlock } from "./editor-auth";

// isEditorUnlocked() lê o localStorage — um dado externo ao React — então em
// vez de copiar esse valor pra um useState via efeito (o que gera um
// primeiro render "errado" seguido de uma correção), useSyncExternalStore
// já resolve isso do jeito certo: usa getServerSnapshot no servidor e na
// primeira passada do cliente (sem mismatch de hidratação), e resincroniza
// sozinho sempre que o evento abaixo dispara.
const EVENTO_MUDANCA = "maintops:editor-mode-changed";

function notificarMudanca(): void {
  window.dispatchEvent(new Event(EVENTO_MUDANCA));
}

function subscribe(callback: () => void): () => void {
  // "storage" avisa outras abas quando o localStorage muda; o evento próprio
  // é pra esta mesma aba, já que "storage" não dispara pra quem fez a mudança.
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

  // Sessões guardadas antes da mudança pra token assinado (ou já vencidas,
  // passadas as 24h) precisam ser descartadas — sem isso, a tela continua
  // mostrando modo editor, mas toda ação de escrita falha silenciosamente
  // com "Não autorizado". Não mexe em estado do React diretamente: só grava
  // no localStorage e dispara o evento, que o useSyncExternalStore acima já
  // está ouvindo pra se ressincronizar sozinho.
  useEffect(() => {
    if (!isEditor) return;
    verifyEditorPassword(getEditorSenha()).then((valida) => {
      if (!valida) {
        lockEditor();
        notificarMudanca();
      }
    });
  }, [isEditor]);

  // A senha digitada só viaja até o servidor uma vez, aqui — o que fica
  // salvo pras próximas ações é o token assinado que a troca devolve, não a
  // senha em si.
  const unlock = useCallback(async (senha: string) => {
    const resultado = await login(senha);
    if (resultado.ok && resultado.token) {
      persistEditorUnlock(resultado.token);
      notificarMudanca();
    }
    return { ok: resultado.ok, erro: resultado.erro };
  }, []);

  const lock = useCallback(() => {
    lockEditor();
    notificarMudanca();
  }, []);

  return { ready: true, isEditor, unlock, lock, getSenha: getEditorSenha };
}
