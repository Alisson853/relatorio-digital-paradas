import { eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { servicoOperacoes } from "@/lib/db/schema";
import type { Servico } from "@/lib/types";

export async function listarOperacoesServico(paradaId: string) {
  return getDb().select().from(servicoOperacoes).where(eq(servicoOperacoes.paradaId, paradaId));
}

// Cada OS tem uma chave própria. Assim, atualizações em serviços diferentes
// não disputam a versão da parada inteira. O UPSERT também mescla o patch no
// Postgres (JSONB ||), numa única instrução: duas fotos enviadas quase juntas
// para a MESMA OS não podem mais perder uma à outra entre SELECT e UPDATE.
// Reenviar a mesma ação é idempotente porque escreve o mesmo valor no mesmo
// campo, em vez de criar outra linha.
export async function salvarOperacaoServico(paradaId: string, servicoId: string, patch: Partial<Servico>): Promise<void> {
  const db = getDb();
  const patchJson = JSON.stringify(patch);
  await db
    .insert(servicoOperacoes)
    .values({ paradaId, servicoId, dados: patch, atualizadoEm: new Date() })
    .onConflictDoUpdate({
      target: [servicoOperacoes.paradaId, servicoOperacoes.servicoId],
      set: {
        dados: sql`${servicoOperacoes.dados} || ${patchJson}::jsonb`,
        atualizadoEm: new Date(),
      },
    });
}

export function aplicarOperacoesNosServicos(servicos: Servico[], operacoes: Array<{ servicoId: string; dados: Partial<Servico> }>): Servico[] {
  const porServico = new Map(operacoes.map((operacao) => [operacao.servicoId, operacao.dados]));
  return servicos.map((servico) => ({ ...servico, ...(porServico.get(servico.id) ?? {}) }));
}
