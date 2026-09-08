import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { COOKIE_SESSAO } from "@/lib/auth/cookies";
import { tokenValido } from "@/lib/auth/token";

// Barreira de acesso na borda (no Next 16 o antigo middleware.ts se chama
// proxy.ts): recusa o download de export antes da rota chegar a rodar.
//
// Importante entender o papel disto: é uma checagem OTIMISTA, não a
// autorização de verdade. A própria documentação do Next desaconselha tratar
// o proxy como camada de autorização — quem realmente autoriza é ehEditor()
// dentro de cada Server Action e de cada rota de export. O proxy existe pra
// que o conteúdo restrito nem chegue a ser renderizado e enviado, em vez de
// ser escondido no navegador (que era o problema do desenho anterior: a
// página de pendências recebia os dados de todos os relatórios e só não os
// desenhava na tela).
//
// Só as rotas de export entram aqui. As páginas restritas (/novo, /pendencias,
// /historico) NÃO são barradas pelo proxy de propósito: cada uma já decide no
// servidor se mostra o conteúdo ou o portão de senha, e fazer o proxy
// redirecionar por cima disso só tiraria da pessoa o formulário de login — ela
// seria jogada pra "/" sem entender por quê, sem lugar pra digitar a senha.
//
// Export é o caso oposto: não tem tela nem portão, é um arquivo que o
// navegador baixa. Aqui a resposta certa é recusar de uma vez.
const ROTAS_RESTRITAS = [/^\/api\/export(\/|$)/];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!ROTAS_RESTRITAS.some((rota) => rota.test(pathname))) {
    return NextResponse.next();
  }

  const autorizado = await tokenValido(request.cookies.get(COOKIE_SESSAO)?.value);
  if (autorizado) return NextResponse.next();

  // Redirect aqui faria o navegador salvar a página de login com nome de
  // .pptx. 401 deixa o erro legível pra quem chamou.
  return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
}

export const config = {
  // Roda so no que importa. Deixar o proxy fora do caminho das paginas e dos
  // assets evita gastar uma execucao de borda em toda requisicao do site.
  matcher: ["/api/export/:path*"],
};
