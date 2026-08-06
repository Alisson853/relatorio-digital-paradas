"use client";

import { useCallback, useEffect, useState } from "react";
import { verifyEditorPassword } from "./actions/auth";
import { getEditorSenha, isEditorUnlocked, lockEditor, persistEditorUnlock } from "./editor-auth";

export function useEditorMode() {
  const [ready, setReady] = useState(false);
  const [isEditor, setIsEditor] = useState(false);

  useEffect(() => {
    setIsEditor(isEditorUnlocked());
    setReady(true);
  }, []);

  const unlock = useCallback(async (senha: string) => {
    const ok = await verifyEditorPassword(senha);
    if (ok) {
      persistEditorUnlock(senha);
      setIsEditor(true);
    }
    return ok;
  }, []);

  const lock = useCallback(() => {
    lockEditor();
    setIsEditor(false);
  }, []);

  return { ready, isEditor, unlock, lock, getSenha: getEditorSenha };
}
