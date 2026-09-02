import * as XLSX from "xlsx";
import type { Equipe } from "./types";
import { limparNomeExecutante } from "./utils";

export interface ServicoImportado {
  numeroOS: string;
  equipamento: string;
  titulo: string;
  equipe: Equipe;
  categoria: string;
  responsavel: string;
  tempoGasto: string;
  concluido: boolean;
}

export interface ResultadoImportacao {
  servicos: ServicoImportado[];
  avisos: string[];
  totalProgramado?: number;
  etiquetaVermelhaProgramada?: number;
  etiquetaAmarelaProgramada?: number;
  // Diferente de "avisos" (bloqueia a importação), isso é só informativo —
  // qual aba foi escolhida quando a planilha tem mais de uma.
  infoAba?: string;
}

function normalizar(texto: unknown): string {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toUpperCase();
}

// Cabeçalhos possíveis para cada coluna que a gente precisa — cobre pequenas
// variações de digitação entre planilhas de máquinas diferentes.
const CABECALHOS: Record<string, string[]> = {
  equipamento: ["EQUIPAMENTO"],
  numeroOS: ["OS/RL", "OS / RL", "OS"],
  descricao: ["DESCRICAO DO SERVICO", "DESCRICAO"],
  oficina: ["OFICINA"],
  tipo: ["TIPO SERVICO", "TIPO DE SERVICO"],
  hh: ["HH"],
  executante: ["EXECUTANTE"],
  executado: ["EXECUTADO"],
};

// Coluna "Executado" costuma ter um ícone (✓ verde / ✗ vermelho) por cima de
// um valor numérico de dropdown — nessa planilha, 2 é o círculo verde e 0 é o
// vermelho. Cobre também texto tipo "SIM"/"OK" pra planilhas formatadas diferente.
function estaExecutado(valor: unknown): boolean {
  if (typeof valor === "number") return valor >= 2;
  const texto = normalizar(valor);
  return texto === "SIM" || texto === "OK" || texto === "EXECUTADO" || texto === "CONCLUIDO" || texto === "TRUE" || texto === "X";
}

function encontrarLinhaCabecalho(linhas: unknown[][]): number {
  for (let i = 0; i < linhas.length; i++) {
    const normalizadas = linhas[i].map(normalizar);
    if (normalizadas.includes("EQUIPAMENTO") && normalizadas.some((c) => CABECALHOS.numeroOS.includes(c))) {
      return i;
    }
  }
  return -1;
}

function encontrarColuna(cabecalho: string[], candidatos: string[]): number {
  for (let i = 0; i < cabecalho.length; i++) {
    if (candidatos.includes(cabecalho[i])) return i;
  }
  return -1;
}

const MAPA_EQUIPE: Array<{ contem: string; equipe: Equipe }> = [
  { contem: "MECANIC", equipe: "Mecânica" },
  { contem: "ELETRIC", equipe: "Elétrica" },
  { contem: "INSTRUMENT", equipe: "Instrumentação" },
  { contem: "CALDEIRARIA", equipe: "Caldeiraria" },
  { contem: "CIVIL", equipe: "Civil" },
  { contem: "PREDITIVA", equipe: "Preditiva" },
  { contem: "SEGURANCA", equipe: "Segurança" },
  { contem: "OPERACAO", equipe: "Operação" },
];

function mapearEquipe(oficina: string): Equipe {
  const normalizada = normalizar(oficina);
  const encontrada = MAPA_EQUIPE.find((m) => normalizada.includes(m.contem));
  return encontrada?.equipe ?? "Mecânica";
}

// Extrai o número da máquina de um texto tipo "PARADA MP11", "Máquina de
// Papel 11" ou "MP-09", pra casar o nome da aba da planilha com o campo
// "Máquina" do relatório.
function extrairNumeroMaquina(texto: string): string | null {
  const normalizado = normalizar(texto);
  const viaMp = normalizado.match(/MP\s*-?\s*(\d{1,2})/);
  if (viaMp) return viaMp[1].padStart(2, "0");
  const viaPapel = normalizado.match(/PAPEL\s+(\d{1,2})/);
  if (viaPapel) return viaPapel[1].padStart(2, "0");
  const viaNumero = normalizado.match(/\b(\d{1,2})\b/);
  return viaNumero ? viaNumero[1].padStart(2, "0") : null;
}

// Conta quantas linhas de serviço uma aba realmente tem (mesma regra do loop
// principal: para depois de 5 linhas vazias em sequência), sem montar os
// ServicoImportado inteiros — só pra comparar abas entre si.
function contarLinhasReais(linhas: unknown[][], idxCabecalho: number, colEquipamento: number): number {
  let total = 0;
  let vazias = 0;
  for (let i = idxCabecalho + 1; i < linhas.length; i++) {
    const equipamento = String((linhas[i] ?? [])[colEquipamento] ?? "").trim();
    if (!equipamento) {
      vazias++;
      if (vazias > 5) break;
      continue;
    }
    vazias = 0;
    total++;
  }
  return total;
}

// Planilhas de programação semanal costumam ter mais de uma aba com serviço
// (ex: uma lista geral de oportunidade e/ou uma por máquina) — puxar sempre
// a primeira aba do arquivo trazia às vezes uma lista bem menor ou de outra
// máquina do que a real. Em vez de adivinhar pelo nome da aba, conta quantas
// linhas de serviço cada uma tem de verdade e usa a mais completa — nome de
// máquina só desempata quando há mais de uma aba com quantidade parecida.
function escolherAba(workbook: XLSX.WorkBook, maquina?: string): { nome: string; infoAba?: string } {
  const candidatas = workbook.SheetNames.map((nome) => {
    const linhas: unknown[][] = XLSX.utils.sheet_to_json(workbook.Sheets[nome], { header: 1, raw: true, defval: null });
    const idxCabecalho = encontrarLinhaCabecalho(linhas);
    if (idxCabecalho === -1) return null;
    const colEquipamento = encontrarColuna(linhas[idxCabecalho].map(normalizar), CABECALHOS.equipamento);
    const linhasReais = contarLinhasReais(linhas, idxCabecalho, colEquipamento);
    return linhasReais > 0 ? { nome, linhasReais } : null;
  }).filter((c): c is { nome: string; linhasReais: number } => c !== null);

  if (candidatas.length === 0) return { nome: workbook.SheetNames[0] };
  if (candidatas.length === 1) return { nome: candidatas[0].nome };

  const maisCompleta = [...candidatas].sort((a, b) => b.linhasReais - a.linhasReais)[0];
  const alvo = maquina ? extrairNumeroMaquina(maquina) : null;
  const casadaPorMaquina = alvo ? candidatas.find((c) => extrairNumeroMaquina(c.nome) === alvo) : undefined;
  // Só usa a aba que bate pelo nome da máquina se ela tiver uma quantidade
  // de serviço perto da maior — senão a mais completa claramente é a lista
  // de verdade dessa parada (ex: aproveitando a parada pra fazer backlog de
  // outras áreas também), e o nome da aba batendo é coincidência.
  const escolhida = casadaPorMaquina && casadaPorMaquina.linhasReais >= maisCompleta.linhasReais * 0.5 ? casadaPorMaquina : maisCompleta;

  if (candidatas.length === 1 || escolhida === casadaPorMaquina) return { nome: escolhida.nome };
  return {
    nome: escolhida.nome,
    infoAba: `Essa planilha tem ${candidatas.length} abas com serviço (${candidatas.map((c) => `${c.nome}: ${c.linhasReais}`).join(", ")}) — usei "${escolhida.nome}" por ter mais linhas. Confira se é a lista certa.`,
  };
}

const MAPA_CATEGORIA: Array<{ contem: string; categoria: string }> = [
  { contem: "ETIQUETA VERMELHA", categoria: "Etiqueta Vermelha" },
  { contem: "ETIQUETA AMARELA", categoria: "Etiqueta Amarela" },
  { contem: "LUBRIFICACAO", categoria: "Lubrificação" },
  { contem: "MELHORIA", categoria: "Melhoria" },
  { contem: "PREDITIVA", categoria: "Preditiva" },
  { contem: "CORRETIVA", categoria: "Corretiva" },
  { contem: "PREVENTIVA", categoria: "Preventiva" },
  { contem: "INSPECAO", categoria: "Preventiva" },
];

function mapearCategoria(tipo: string): string {
  const normalizada = normalizar(tipo);
  const encontrada = MAPA_CATEGORIA.find((m) => normalizada.includes(m.contem));
  return encontrada?.categoria ?? "Corretiva";
}

// A célula da OS guarda um número puro (53454), mas o time sempre digita/lê
// com ponto de milhar (53.454) — sem isso, o número importado nunca bate com
// o de uma OS já cadastrada manualmente, e o merge de "já existe" nunca acha.
function formatarNumeroOS(valor: unknown): string {
  const texto = String(valor ?? "").trim();
  if (!texto) return "Oportunidade";
  if (/^\d+$/.test(texto)) return texto.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  // Placeholder tipo "???????" (OS ainda não definida) não é um número de OS
  // de verdade — várias linhas diferentes usam o mesmo texto genérico, e
  // tratar isso como se fosse uma OS real faz elas se misturarem no merge
  // por número de OS (o serviço de uma vira "dono" do responsável da outra).
  if (!/[A-Za-zÀ-ÖØ-öø-ÿ0-9]/.test(texto)) return "Oportunidade";
  return texto;
}

// A coluna HH vem como fração de dia (0.1667 = 4h) quando o Excel guarda um
// horário, mas às vezes chega como texto "4:00" — cobre os dois casos.
function formatarTempo(valor: unknown): string {
  if (typeof valor === "number") {
    const totalMinutos = Math.round(valor * 24 * 60);
    const horas = Math.floor(totalMinutos / 60);
    const minutos = totalMinutos % 60;
    if (horas === 0) return `${minutos}min`;
    return minutos === 0 ? `${horas}h` : `${horas}h${minutos}min`;
  }
  if (valor instanceof Date) {
    const horas = valor.getUTCHours();
    const minutos = valor.getUTCMinutes();
    if (horas === 0) return `${minutos}min`;
    return minutos === 0 ? `${horas}h` : `${horas}h${minutos}min`;
  }
  const texto = String(valor ?? "").trim();
  return texto || "1h";
}

function horasParaMinutos(tempoGasto: string): number {
  const match = tempoGasto.match(/(?:(\d+)h)?(?:(\d+)min)?/);
  if (!match) return 0;
  const horas = Number(match[1] ?? 0);
  const minutos = Number(match[2] ?? 0);
  return horas * 60 + minutos;
}

function minutosParaTempo(totalMinutos: number): string {
  const horas = Math.floor(totalMinutos / 60);
  const minutos = totalMinutos % 60;
  if (horas === 0) return `${minutos}min`;
  return minutos === 0 ? `${horas}h` : `${horas}h${minutos}min`;
}

// O painel no topo da planilha (antes da tabela de OS) traz os totais
// programados pra semana — bate esses números com o relatório em vez de
// deixar "OS Planejadas" preso no que foi digitado manualmente uma vez.
function extrairNumeroDaLinha(linha: unknown[], rotulo: string): number | undefined {
  const idxRotulo = linha.findIndex((c) => normalizar(c).includes(rotulo));
  if (idxRotulo === -1) return undefined;
  for (let i = idxRotulo + 1; i < linha.length; i++) {
    const valor = linha[i];
    if (typeof valor === "number") return valor;
  }
  return undefined;
}

function extrairResumoPainel(linhas: unknown[][], ateLinha: number) {
  let totalProgramado: number | undefined;
  let etiquetaVermelhaProgramada: number | undefined;
  let etiquetaAmarelaProgramada: number | undefined;

  for (let i = 0; i < ateLinha; i++) {
    const linha = linhas[i] ?? [];
    totalProgramado ??= extrairNumeroDaLinha(linha, "TRABALHOS PROGRAMADOS");
    etiquetaVermelhaProgramada ??= extrairNumeroDaLinha(linha, "ETIQUETA VERMELHA");
    etiquetaAmarelaProgramada ??= extrairNumeroDaLinha(linha, "ETIQUETA AMARELA");
  }

  return { totalProgramado, etiquetaVermelhaProgramada, etiquetaAmarelaProgramada };
}

export async function parsePlanilhaServicos(file: File, maquina?: string): Promise<ResultadoImportacao> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const avisos: string[] = [];

  if (workbook.SheetNames.length === 0) return { servicos: [], avisos: ["A planilha não tem nenhuma aba."] };
  const { nome: nomeAba, infoAba } = escolherAba(workbook, maquina);

  const sheet = workbook.Sheets[nomeAba];
  const linhas: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null });

  const idxCabecalho = encontrarLinhaCabecalho(linhas);
  if (idxCabecalho === -1) {
    return { servicos: [], avisos: ['Não encontrei uma linha com as colunas "EQUIPAMENTO" e "OS/RL" nessa planilha.'] };
  }

  const cabecalho = linhas[idxCabecalho].map(normalizar);
  const col = {
    equipamento: encontrarColuna(cabecalho, CABECALHOS.equipamento),
    numeroOS: encontrarColuna(cabecalho, CABECALHOS.numeroOS),
    descricao: encontrarColuna(cabecalho, CABECALHOS.descricao),
    oficina: encontrarColuna(cabecalho, CABECALHOS.oficina),
    tipo: encontrarColuna(cabecalho, CABECALHOS.tipo),
    hh: encontrarColuna(cabecalho, CABECALHOS.hh),
    executante: encontrarColuna(cabecalho, CABECALHOS.executante),
    executado: encontrarColuna(cabecalho, CABECALHOS.executado),
  };

  // Linhas duplicadas com a mesma OS (o mesmo serviço com horas lançadas por
  // pessoas/turnos diferentes) viram uma única entrada, somando o tempo.
  const porOs = new Map<string, ServicoImportado>();
  let linhasVazias = 0;

  for (let i = idxCabecalho + 1; i < linhas.length; i++) {
    const linha = linhas[i] ?? [];
    const equipamento = String(linha[col.equipamento] ?? "").trim();
    if (!equipamento) {
      linhasVazias++;
      if (linhasVazias > 5) break;
      continue;
    }
    linhasVazias = 0;

    const descricao = String(linha[col.descricao] ?? "").trim();
    const oficina = String(linha[col.oficina] ?? "").trim();
    // Serviço da equipe Operacional não é trabalho de manutenção — não entra
    // no relatório, mas a linha ainda conta como "não vazia" pro contador
    // acima (senão várias linhas Operacional seguidas cortariam a
    // importação como se a planilha tivesse acabado).
    if (normalizar(oficina) === "OPERACIONAL") continue;

    const numeroOS = formatarNumeroOS(linha[col.numeroOS]);
    const tipo = String(linha[col.tipo] ?? "").trim();
    const executante = limparNomeExecutante(String(linha[col.executante] ?? ""));
    const tempoGasto = formatarTempo(linha[col.hh]);
    const concluido = col.executado !== -1 && estaExecutado(linha[col.executado]);

    const existente = porOs.get(numeroOS);
    if (existente && numeroOS !== "Oportunidade") {
      existente.tempoGasto = minutosParaTempo(horasParaMinutos(existente.tempoGasto) + horasParaMinutos(tempoGasto));
      if (executante && !existente.responsavel.includes(executante)) {
        existente.responsavel = existente.responsavel ? `${existente.responsavel} + ${executante}` : executante;
      }
      // Se qualquer lançamento dessa OS foi marcado executado, a OS toda conta como concluída.
      if (concluido) existente.concluido = true;
      continue;
    }

    porOs.set(numeroOS === "Oportunidade" ? `${numeroOS}-${i}` : numeroOS, {
      numeroOS,
      equipamento,
      titulo: descricao || equipamento,
      equipe: mapearEquipe(oficina),
      categoria: mapearCategoria(tipo),
      responsavel: executante,
      tempoGasto,
      concluido,
    });
  }

  const servicos = Array.from(porOs.values());
  if (servicos.length === 0) avisos.push("Nenhuma linha de serviço foi encontrada abaixo do cabeçalho.");

  const resumoPainel = extrairResumoPainel(linhas, idxCabecalho);

  return { servicos, avisos, infoAba, ...resumoPainel };
}
