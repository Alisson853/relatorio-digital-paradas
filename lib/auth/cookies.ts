// Nomes dos cookies de sessão, num módulo próprio de propósito.
//
// O proxy.ts roda no Edge e precisa saber qual cookie ler, mas não pode
// importar session.ts — aquele arquivo usa next/headers e node:crypto, que não
// existem naquele runtime. Isolar só os nomes aqui evita a duplicação de
// string ("qual era o nome do cookie mesmo?") sem arrastar o resto junto.

// O cookie de verdade: httpOnly, assinado, é o único que autoriza qualquer coisa.
export const COOKIE_SESSAO = "maintops_sessao";

// Cookie legível pelo JavaScript que carrega apenas "1". Serve pra tela saber
// se deve desenhar os controles de edição sem perguntar ao servidor a cada
// render. Não concede acesso a nada: forjá-lo mostra os botões e nada mais.
export const COOKIE_UI = "maintops_editor_ui";
