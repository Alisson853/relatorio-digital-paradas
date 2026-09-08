"use client";

import { useRouter } from "next/navigation";
import { useEditorMode } from "@/lib/useEditorMode";
import { EditorPasswordForm } from "./EditorPasswordForm";

// Portão de senha pra página que é renderizada no SERVIDOR e cujo conteúdo é
// restrito (hoje: /historico).
//
// A diferença em relação ao EditorOnly é onde a decisão acontece. O EditorOnly
// roda no cliente: a página inteira já foi montada e enviada, e ele apenas
// deixa de desenhar um pedaço. Isso serve pra esconder botão, não pra proteger
// dado — o conteúdo já está no HTML que chegou no navegador, a um "ver código
// fonte" de distância.
//
// Aqui é o contrário: a página confere ehEditor() no servidor e, se não houver
// sessão, nem chega a consultar o banco — manda este portão no lugar dos dados.
// Depois do login, router.refresh() pede a mesma rota de novo, agora com o
// cookie de sessão, e o servidor devolve o conteúdo de verdade.
export function PortaoEditor({ titulo, descricao }: { titulo: string; descricao: string }) {
  const { unlock } = useEditorMode();
  const router = useRouter();

  return (
    <div className="mx-auto max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <EditorPasswordForm onUnlock={unlock} onSuccess={() => router.refresh()} titulo={titulo} descricao={descricao} />
    </div>
  );
}
