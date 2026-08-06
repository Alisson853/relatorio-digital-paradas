"use client";

import { useEditorMode } from "@/lib/useEditorMode";

export function EditorOnly({ children }: { children: React.ReactNode }) {
  const { ready, isEditor } = useEditorMode();
  if (!ready || !isEditor) return null;
  return <>{children}</>;
}
