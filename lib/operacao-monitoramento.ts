import { desc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { eventosOperacionais } from "@/lib/db/schema";

export type SeveridadeOperacional = "info" | "alerta" | "erro";

function idEvento(): string {
  return `evt-${Date.now().toString(36)}-${crypto.randomUUID()}`;
}

export async function registrarEventoOperacional(input: {
  tipo: string;
  severidade: SeveridadeOperacional;
  mensagem: string;
  paradaId?: string;
  servicoId?: string;
  detalhe?: Record<string, unknown>;
}): Promise<void> {
  try {
    await getDb().insert(eventosOperacionais).values({
      id: idEvento(),
      tipo: input.tipo.slice(0, 80),
      severidade: input.severidade,
      mensagem: input.mensagem.slice(0, 1000),
      paradaId: input.paradaId,
      servicoId: input.servicoId,
      detalhe: input.detalhe ?? {},
    });
  } catch (erro) {
    // O monitoramento jamais pode derrubar a operação principal. O log ainda
    // deixa rastros se a própria infraestrutura do banco estiver indisponível.
    console.error("Falha ao registrar evento operacional", erro);
  }
}

export async function listarEventosOperacionaisAbertos(limite = 12) {
  return getDb()
    .select()
    .from(eventosOperacionais)
    .where(isNull(eventosOperacionais.resolvidoEm))
    .orderBy(desc(eventosOperacionais.criadoEm))
    .limit(Math.min(Math.max(limite, 1), 50));
}

export async function resolverEventoOperacional(id: string): Promise<void> {
  await getDb().update(eventosOperacionais).set({ resolvidoEm: new Date() }).where(eq(eventosOperacionais.id, id));
}
