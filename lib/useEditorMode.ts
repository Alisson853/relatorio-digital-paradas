"use client";

import { useCallback, useEffect, useState } from "react";
import { login, verifyEditorPassword } from "./actions/auth";
import { getEditorSenha, isEditorUnlocked, lockEditor, persistEditorUnlock } from "./editor-auth";

export function useEditorMode() {
  const [ready, setReady] = useState(false);
  const [isEditor, setIsEditor] = useState(false);

  useEffect(() => {
    const desbloqueado = isEditorUnlocked();
    setIsEditor(desbloqueado);
    setReady(true);
    if (!desbloqueado) return;
    // Sessões guardadas antes da mudança pra token assinado (ou já vencidas,
    // passadas as 24h) precisam ser descartadas — sem isso, a tela continua
    // mostrando modo editor, mas toda ação de escrita falha silenciosamente
    // com "Não autorizado".
    verifyEditorPassword(getEditorSenha()).then((valida) => {
      if (!valida) {
        lockEditor();
        setIsEditor(false);
      }
    });
  }, []);

  // A senha digitada só viaja até o servidor uma vez, aqui — o que fica
  // salvo pras próximas ações é o token assinado que a troca devolve, não a
  // senha em si.
  const unlock = useCallback(async (senha: string) => {
    const resultado = await login(senha);
    if (resultado.ok && resultado.token) {
      persistEditorUnlock(resultado.token);
      setIsEditor(true);
    }
    return { ok: resultado.ok, erro: resultado.erro };
  }, []);

  const lock = useCallback(() => {
    lockEditor();
    setIsEditor(false);
  }, []);

  return { ready, isEditor, unlock, lock, getSenha: getEditorSenha };
}
