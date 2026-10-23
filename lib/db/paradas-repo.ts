import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { paradas } from "@/lib/db/schema";
import type { NovaParadaRow, ParadaRow } from "@/lib/db/schema";

// Concorrência otimista sobre a coluna que já existe (atualizado_em), sem
// precisar de uma coluna de versão nova nem de transação com lock.
//
// Por que não uma transação com SELECT ... FOR UPDATE: o driver usado em
// lib/db/index.ts é o neon-http, que fala com o Postgres por HTTP — cada
// .execute() é uma requisição própria, sem uma conexão persistente para
// segurar um lock entre o SELECT e o UPDATE. Uma escrita condicional de uma
// via só (UPDATE ... WHERE atualizado_em = X) não depende disso: o próprio
// Postgres resolve a corrida no nível da linha, então funciona igual com
// qualquer driver.

export type ResultadoAplicar<Extra> = { valores: Partial<NovaParadaRow>; extra?: Extra } | { erro: string };

// Abstração sobre as três operações de banco que os mecanismos abaixo
// precisam. Existe só para permitir testar a lógica de concorrência (retry,
// detecção de conflito) com uma implementação em memória, sem depender de um
// Postgres real — a implementação de verdade (paradaStorePostgres) é a usada
// em produção e é a única que fala com o banco.
export interface ParadaStore {
  buscarPorId(id: string): Promise<ParadaRow | null>;
  atualizarSeVersaoBater(id: string, versaoEsperada: Date, valores: Partial<NovaParadaRow>): Promise<boolean>;
  upsert(valores: NovaParadaRow, versaoEsperada: Date | null): Promise<boolean>;
}

export const paradaStorePostgres: ParadaStore = {
  async buscarPorId(id) {
    const [row] = await getDb().select().from(paradas).where(eq(paradas.id, id)).limit(1);
    return row ?? null;
  },

  async atualizarSeVersaoBater(id, versaoEsperada, valores) {
    const linhas = await getDb()
      .update(paradas)
      .set({ ...valores, atualizadoEm: new Date() })
      .where(and(eq(paradas.id, id), eq(paradas.atualizadoEm, versaoEsperada)))
      .returning({ id: paradas.id });
    return linhas.length > 0;
  },

  // versaoEsperada null = criação nova (id ainda não existe no banco, sem
  // conflito possível) — segue como um upsert comum. Não-null = o cliente
  // carregou um relatório existente e só pode substituí-lo se ele ainda
  // estiver na mesma versão que foi carregada; senão, alguém mexeu no meio
  // do caminho e a gravação não deve acontecer silenciosamente.
  async upsert(valores, versaoEsperada) {
    // set: valores inclui "id" — redundante (o conflito já garante que
    // excluded.id === paradas.id), mas inofensivo: não muda a chave, só
    // evita reconstruir o objeto sem ele.
    const base = getDb().insert(paradas).values(valores);
    const comConflito = versaoEsperada
      ? base.onConflictDoUpdate({ target: paradas.id, set: valores, setWhere: eq(paradas.atualizadoEm, versaoEsperada) })
      : base.onConflictDoUpdate({ target: paradas.id, set: valores });
    const linhas = await comConflito.returning({ id: paradas.id });
    return linhas.length > 0;
  },
};

// Em campo, vários celulares podem fechar OS no mesmo minuto. Cinco novas
// tentativas imediatas só faziam todos baterem no banco de novo juntos. Doze
// tentativas com espera progressiva espalham as gravações sem segurar lock ou
// conexão persistente (o Neon usa HTTP) e absorvem picos reais de equipe.
const MAX_TENTATIVAS = 10;

function esperarAntesDeTentarDeNovo(tentativa: number): Promise<void> {
  // Exponencial moderado (50ms, 100ms, ... até 500ms) + jitter. O teto mantém a
  // interação de campo responsiva; o jitter impede que dois aparelhos que
  // conflitaram continuem sincronizados para sempre.
  const base = Math.min(50 * 2 ** tentativa, 500);
  const jitter = Math.floor(Math.random() * 50);
  return new Promise((resolve) => setTimeout(resolve, base + jitter));
}

// Usado por toda mutação pontual (foto, status, "não será feito", nova OS
// rápida, novo evento) que hoje lê o relatório inteiro, muda um item do
// array e regrava o array inteiro de volta. Sem isto, duas gravações
// concorrentes (ex: dois celulares na Captura Rápida, cada um mexendo numa
// OS diferente da mesma parada) fazem a segunda apagar sem querer a mudança
// que a primeira acabou de salvar.
//
// `aplicar` recebe a leitura mais fresca possível a cada tentativa e devolve
// os campos a gravar. Se a gravação falhar por a versão ter mudado no meio
// do caminho, relê o estado (já com a mudança concorrente) e aplica a MESMA
// intenção de novo em cima dele — cada mutação pontual é uma função pura do
// tipo "achar o serviço X e mudar o campo Y", que continua correta reaplicada
// sobre um array mais novo.
export async function escreverComVersao<Extra = undefined>(
  id: string,
  aplicar: (row: ParadaRow) => ResultadoAplicar<Extra>,
  store: ParadaStore = paradaStorePostgres
): Promise<{ ok: true; extra: Extra } | { ok: false; erro: string }> {
  for (let tentativa = 0; tentativa < MAX_TENTATIVAS; tentativa++) {
    const row = await store.buscarPorId(id);
    if (!row) return { ok: false, erro: "Relatório não encontrado." };

    const resultado = aplicar(row);
    if ("erro" in resultado) return { ok: false, erro: resultado.erro };

    const sucesso = await store.atualizarSeVersaoBater(id, row.atualizadoEm, resultado.valores);
    if (sucesso) return { ok: true, extra: resultado.extra as Extra };
    // Conflito: outra escrita aconteceu entre a leitura e a gravação. Tenta
    // de novo com dado fresco em vez de devolver erro na primeira tentativa —
    // isso é o esperado sempre que duas pessoas mexem na mesma parada quase
    // ao mesmo tempo, não uma falha de verdade. Espera antes de reler: sem
    // isso todos os celulares repetem a mesma corrida no mesmo instante.
    if (tentativa < MAX_TENTATIVAS - 1) await esperarAntesDeTentarDeNovo(tentativa);
  }
  return { ok: false, erro: "Muitas alterações simultâneas neste relatório. Tente novamente em instantes." };
}

// Usado só por saveParada: diferente das mutações pontuais acima, aqui o
// cliente reenvia o relatório inteiro editado no formulário — não existe um
// "patch" pequeno pra reaplicar, é uma substituição completa. Por isso, ao
// contrário de escreverComVersao, este NÃO tenta de novo sozinho: se a versão
// não bate, quem chamou (saveParada) precisa recusar a gravação e avisar,
// porque sobrescrever automaticamente arriscaria apagar uma mudança de campo
// (foto, status) feita por outra pessoa enquanto o formulário estava aberto.
export async function upsertComVersao(
  valores: NovaParadaRow,
  versaoEsperada: Date | null,
  store: ParadaStore = paradaStorePostgres
): Promise<boolean> {
  return store.upsert(valores, versaoEsperada);
}
