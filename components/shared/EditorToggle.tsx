"use client";

import { useState } from "react";
import { LockKeyholeOpen, LockKeyhole, X } from "lucide-react";
import { useEditorMode } from "@/lib/useEditorMode";
import { EditorPasswordForm } from "./EditorPasswordForm";

export function EditorToggle() {
  const { ready, isEditor, unlock, lock } = useEditorMode();
  const [open, setOpen] = useState(false);

  if (!ready) return null;

  if (isEditor) {
    return (
      <button
        type="button"
        onClick={lock}
        className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 transition-colors hover:text-slate-700"
      >
        <LockKeyholeOpen size={13} />
        Sair do Modo Editor
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 transition-colors hover:text-slate-700"
      >
        <LockKeyhole size={13} />
        Área do Editor
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 px-6" onClick={() => setOpen(false)}>
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setOpen(false)}
              aria-label="Fechar"
              className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100"
            >
              <X size={14} />
            </button>
            <EditorPasswordForm onUnlock={unlock} onSuccess={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
