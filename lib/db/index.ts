import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// APP_DATABASE_URL antes de DATABASE_URL, e a ordem tem motivo.
//
// DATABASE_URL e criada e mantida pela integracao do Neon com a Vercel — nao
// da pra edita-la pelo painel, e mesmo que desse, a integracao pode
// sobrescrever o valor num sync. Ela aponta pro role DONO do banco, que alem
// de ler e gravar relatorios pode dropar tabela e criar usuario. Uma string
// dessas vazada (um log, um print, um backup de env) entrega o banco inteiro.
//
// APP_DATABASE_URL e nossa: aponta pro role app_paradas, que so tem SELECT,
// INSERT, UPDATE e DELETE nas duas tabelas do app. Sem CREATE, sem DROP, sem
// ALTER — migracao continua sendo feita a mao, com a credencial de dono.
//
// O fallback pra DATABASE_URL fica por seguranca operacional: um ambiente que
// ainda nao tenha a variavel nova continua subindo, em vez de quebrar tudo por
// causa de uma variavel faltando.
function createDb() {
  const sql = neon(process.env.APP_DATABASE_URL || process.env.DATABASE_URL!);
  return drizzle(sql, { schema });
}

let _db: ReturnType<typeof createDb> | null = null;

export function getDb() {
  if (!_db) _db = createDb();
  return _db;
}
