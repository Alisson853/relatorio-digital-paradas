import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { servicoOperacoes } from "@/lib/db/schema";
import type { Servico } from "@/lib/types";

export async function listarOperacoesServico(paradaId: string) {
  return getDb().select().from(servicoOperacoes).where(eq(servicoOperacoes.paradaId, paradaId));
}

// Cada OS tem uma chave própria. Assim, atualizações em serviços diferentes
// não disputam a versão da parada inteira. Em uma mesma OS, mesclamos o patch
// anterior para preservar fotos Antes/Durante/Depois entre capturas.
export async function salvarOperacaoServico(paradaId: string, servicoId: string, patch: Partial<Servico>): Promise<void> {
  const db = getDb();
  const [existente] = await db
    .select()
    .from(servicoOperacoes)
    .where(and(eq(servicoOperacoes.paradaId, paradaId), eq(servicoOperacoes.servicoId, servicoId)))
    .limit(1);
  const dados = { ...(existente?.dados ?? {}), ...patch };

  if (existente) {
    await db
      .update(servicoOperacoes)
      .set({ dados, atualizadoEm: new Date() })
      .where(and(eq(servicoOperacoes.paradaId, paradaId), eq(servicoOperacoes.servicoId, servicoId)));
    return;
  }

  await db.insert(servicoOperacoes).values({ paradaId, servicoId, dados, atualizadoEm: new Date() });
}

export function aplicarOperacoesNosServicos(servicos: Servico[], operacoes: Array<{ servicoId: string; dados: Partial<Servico> }>): Servico[] {
  const porServico = new Map(operacoes.map((operacao) => [operacao.servicoId, operacao.dados]));
  return servicos.map((servico) => ({ ...servico, ...(porServico.get(servico.id) ?? {}) }));
}
