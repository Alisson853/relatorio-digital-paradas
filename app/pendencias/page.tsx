import { PendenciasChecklist } from "@/components/dashboard/PendenciasChecklist";
import { PageHeader } from "@/components/shared/PageHeader";

export const dynamic = "force-dynamic";

// Não busca os dados aqui: listChecklistPendencias cruza informação de TODOS
// os relatórios, então só é chamada depois que o PendenciasChecklist (client)
// confirma que o modo editor está desbloqueado — buscar no servidor e só
// esconder na tela mandaria os dados pra qualquer visitante mesmo assim.
export default function PendenciasPage() {
  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Checklist de Pendências" subtitle="Fotos e status faltando em todos os relatórios" />

      <main id="conteudo" className="mx-auto max-w-5xl px-4 py-8 sm:px-10 sm:py-10">
        <PendenciasChecklist />
      </main>
    </div>
  );
}
