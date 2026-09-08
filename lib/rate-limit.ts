import { sql } from "drizzle-orm";
import { headers } from "next/headers";
import { getDb } from "@/lib/db";

// Rate limit compartilhado entre todas as instâncias, guardado no Postgres.
//
// A versão anterior era um Map na memória do processo. Em serverless isso não
// limita nada de verdade: cada instância tem o próprio Map, um cold start zera
// o contador, e quem está tentando adivinhar a senha só precisa insistir até
// cair numa instância nova. Com o contador no banco, o limite é um só.
//
// A conta inteira acontece dentro de um único INSERT ... ON CONFLICT: ler,
// decidir e gravar em uma ida ao banco. Se fosse SELECT e depois UPDATE, duas
// requisições simultâneas leriam o mesmo valor e ambas passariam — exatamente
// o que um ataque paralelo faz.

export interface ResultadoLimite {
  permitido: boolean;
  restantes: number;
}

export async function consumirLimite(chave: string, limite: number, janelaSegundos: number): Promise<ResultadoLimite> {
  try {
    const linhas = await getDb().execute(sql`
      insert into rate_limits (chave, contagem, janela_inicio)
      values (${chave}, 1, now())
      on conflict (chave) do update set
        contagem = case
          when rate_limits.janela_inicio < now() - (${janelaSegundos} * interval '1 second') then 1
          else rate_limits.contagem + 1
        end,
        janela_inicio = case
          when rate_limits.janela_inicio < now() - (${janelaSegundos} * interval '1 second') then now()
          else rate_limits.janela_inicio
        end
      returning contagem
    `);

    const registros = (linhas as unknown as { rows?: Array<{ contagem: number }> }).rows ?? (linhas as unknown as Array<{ contagem: number }>);
    const contagem = Number(registros?.[0]?.contagem ?? 1);
    return { permitido: contagem <= limite, restantes: Math.max(0, limite - contagem) };
  } catch {
    // Banco fora do ar não pode virar um portão trancado: o app inteiro depende
    // do Postgres, então se ele caiu o rate limit é o menor dos problemas.
    // Deixa passar e falha na operação em si, que é onde o erro faz sentido.
    return { permitido: true, restantes: limite };
  }
}

// Identidade do requisitante pro rate limit. Na Vercel, x-forwarded-for é
// preenchido pela borda e o primeiro item é o IP real do cliente — cabeçalho
// vindo do navegador não sobrescreve isso.
export async function identificarRequisitante(): Promise<string> {
  const h = await headers();
  const encaminhado = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return encaminhado || h.get("x-real-ip") || "desconhecido";
}

export function limiteExcedidoMsg(): string {
  return "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo.";
}
