// Gera o valor de EDITOR_PASSWORD_HASH a partir de uma senha.
//
//   node scripts/gerar-hash-senha.mjs "a senha aqui"
//
// Copie a linha impressa e cole como variável de ambiente na Vercel (e no
// .env.local, se for rodar local). Depois disso, apague EDITOR_PASSWORD dos
// dois lugares: com o hash configurado, a senha em texto puro deixa de ser
// usada pra login, mas continuaria valendo enquanto existir — e é justamente
// ela que a gente quer parar de guardar.
//
// O formato é "scrypt$<salt em hex>$<derivada em hex>". O salt é aleatório e
// vai junto, como é normal: ele não é segredo, existe pra que a mesma senha
// não gere sempre o mesmo hash (senão uma tabela pronta de hashes comuns
// resolveria tudo de uma vez).

import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const CUSTO = { N: 16384, r: 8, p: 1 };
const TAMANHO_CHAVE = 64;

const senha = process.argv[2];

if (!senha) {
  console.error('Uso: node scripts/gerar-hash-senha.mjs "sua senha"');
  process.exit(1);
}

if (senha.length < 10) {
  // scrypt encarece cada tentativa, mas não salva uma senha curta: quem pegar
  // o hash testa offline, sem passar pelo rate limit do app.
  console.error("Senha muito curta. Use pelo menos 10 caracteres.");
  process.exit(1);
}

const salt = randomBytes(16);
const derivada = await scrypt(senha, salt, TAMANHO_CHAVE, CUSTO);

console.log("");
console.log("Cole isto na Vercel (Settings > Environment Variables) e no .env.local:");
console.log("");
console.log(`EDITOR_PASSWORD_HASH=scrypt$${salt.toString("hex")}$${derivada.toString("hex")}`);
console.log("");
console.log("Depois remova EDITOR_PASSWORD dos dois lugares.");
console.log("");
console.log("Gere também uma chave de assinatura de sessão, separada da senha:");
console.log("");
console.log(`SESSION_SECRET=${randomBytes(32).toString("base64url")}`);
console.log("");
