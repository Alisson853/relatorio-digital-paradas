import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    concluida: "Concluída",
    ressalvas: "Concluída com Ressalvas",
    em_andamento: "Em Andamento",
    concluido: "Concluído",
    atrasado: "Atrasado",
    pendente: "Pendente",
  };
  return map[status] ?? status;
}

export function statusColorClasses(status: string): string {
  const map: Record<string, string> = {
    concluida: "bg-success-100 text-success-600",
    concluido: "bg-success-100 text-success-600",
    ressalvas: "bg-warning-100 text-warning-600",
    atrasado: "bg-danger-100 text-danger-600",
    em_andamento: "bg-brand-100 text-brand-700",
    pendente: "bg-slate-200 text-slate-600",
  };
  return map[status] ?? "bg-slate-200 text-slate-600";
}

export function statusDotClasses(status: string): string {
  const map: Record<string, string> = {
    concluida: "bg-success-600",
    concluido: "bg-success-600",
    ressalvas: "bg-warning-600",
    atrasado: "bg-danger-600",
    em_andamento: "bg-brand-500",
    pendente: "bg-slate-400",
  };
  return map[status] ?? "bg-slate-400";
}

export function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

// Data curta pra grades estreitas: "02 SET 2026".
//
// Existe por um motivo concreto. Na capa, a data dividia uma faixa de quatro
// colunas com tempo planejado, realizado e responsavel; "02 de setembro de
// 2026" nao cabia e aparecia como "02 de setemb…". Truncar uma data e o pior
// dos dois mundos — ocupa a largura toda e ainda esconde o ano, que e
// justamente o que alguem procura ali.
//
// O formato curto cabe inteiro e, em caixa alta e fonte mono, conversa com o
// resto dos rotulos tecnicos da capa em vez de destoar.
export function formatDateCompact(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  const mes = d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "").toUpperCase();
  return `${String(d.getDate()).padStart(2, "0")} ${mes} ${d.getFullYear()}`;
}

// A coluna "Executante" da planilha às vezes traz lixo em vez de nome —
// número de turno, célula com erro de acentuação virando uma sequência de
// "?". Usado tanto na importação (pra nem gravar isso como responsável)
// quanto na Captura Rápida (pra decidir o que virar chip/aparecer no card).
export function pareceNomeDePessoa(texto: string): boolean {
  return /[A-Za-zÀ-ÖØ-öø-ÿ]{2,}/.test(texto);
}

// Recebe o valor bruto da célula "Executante" (pode ter mais de uma pessoa
// já separada por "+", ou lixo de codificação) e devolve só os nomes que
// realmente parecem nome — cada um limpo de espaço duplo, unidos de novo
// por " + ". Se nada sobrar, devolve string vazia (sem responsável).
export function limparNomeExecutante(bruto: string): string {
  return bruto
    .split(/\s*\+\s*/)
    .map((parte) => parte.trim().replace(/\s+/g, " "))
    .filter(pareceNomeDePessoa)
    .join(" + ");
}

export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Sufixo aleatorio pro id do relatorio.
//
// O id vira a URL publica que o QR code da capa abre, e abrir essa URL nao pede
// senha — e assim de proposito. Mas o id anterior era "<nome>-<timestamp em
// base36>": as duas metades sao adivinhaveis. O nome da parada e conhecido de
// quem trabalha na fabrica, e o timestamp e o momento da criacao, que cabe numa
// faixa pequena o bastante pra ser varrida. Ou seja, quem conhecesse o padrao
// chegava a relatorios cujo link nunca recebeu.
//
// Com 8 caracteres aleatorios (32 bits do gerador criptografico do navegador,
// ~1 bilhao de combinacoes por nome), varrer deixa de ser pratico: o link vira
// de fato a credencial que ele sempre foi na intencao. Nao e controle de
// acesso — quem tem o link entra, como antes — e sim tirar o link do alcance
// de quem so chuta.
export function sufixoAleatorio(tamanho = 8): string {
  const bytes = crypto.getRandomValues(new Uint8Array(tamanho));
  // base36 sem 0/O/1/l seria mais legivel, mas o id raramente e digitado a mao;
  // o que importa aqui e o alfabeto ser seguro numa URL.
  return Array.from(bytes, (b) => (b % 36).toString(36)).join("");
}
