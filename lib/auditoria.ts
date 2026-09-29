// Trilha de auditoria mínima: quando, qual ação, o que foi afetado, e de
// onde a requisição veio. Não grava no banco — nenhuma tabela nova, nenhuma
// migração — porque uma linha JSON estruturada no log do servidor já é
// suficiente para o problema que existe hoje (nenhum registro de quem fez o
// quê) sem comprometer nada da arquitetura atual. A Vercel mantém esses logs
// e permite buscar por eles (painel de Observability, ou `vercel logs`).
//
// SOBRE "QUEM": o campo `origem` é o IP do requisitante (o mesmo que
// lib/rate-limit.ts já usa) — NÃO é identidade de pessoa. O modo editor
// deste app é uma senha única e compartilhada (ver lib/auth/session.ts e
// lib/auth/token.ts): o token de sessão não carrega nome, id nem qualquer
// outro dado de quem digitou a senha, então não existe, hoje, uma forma
// honesta de dizer "fulano fez X" — só "uma requisição de tal IP fez X", e
// nem isso é confiável 1:1 com uma pessoa (várias pessoas na mesma rede da
// fábrica compartilham o mesmo IP público; a mesma pessoa trocando de wifi
// pra dados móveis muda de IP no meio do trabalho).
//
// Uma identificação de pessoa confiável precisaria de UM destes (nenhum
// implementado aqui, de propósito — é uma mudança de autenticação, fora do
// escopo deste bloco):
//   1. Login individual (ex: um PIN curto por pessoa, além da senha de
//      editor) — o mínimo que já resolveria, sem exigir conta de e-mail nem
//      cadastro completo.
//   2. Um campo "seu nome" obrigatório e re-confirmado a cada ação de
//      escrita — funciona, mas é fricção extra em toda ação da Captura
//      Rápida, que hoje é otimizada pra ser rápida.
//   3. Identidade vinda de fora (SSO corporativo, certificado de
//      dispositivo) — mais robusto, mas é infraestrutura nova.
export interface EventoAuditoria {
  acao: string;
  paradaId: string;
  servicoId?: string;
  origem: string;
  detalhe?: Record<string, unknown>;
}

export function registrarAuditoria(evento: EventoAuditoria): void {
  console.log(
    JSON.stringify({
      tipo: "auditoria",
      em: new Date().toISOString(),
      ...evento,
    })
  );
}
