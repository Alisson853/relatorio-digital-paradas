import * as XLSX from "xlsx";
import type { Equipe } from "./types";

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

export async function parsePlanilhaServicos(file: File): Promise<ResultadoImportacao> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const avisos: string[] = [];

  const nomeAba = workbook.SheetNames[0];
  if (!nomeAba) return { servicos: [], avisos: ["A planilha não tem nenhuma aba."] };

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

    const numeroOS = String(linha[col.numeroOS] ?? "").trim() || "Oportunidade";
    const descricao = String(linha[col.descricao] ?? "").trim();
    const oficina = String(linha[col.oficina] ?? "").trim();
    const tipo = String(linha[col.tipo] ?? "").trim();
    const executante = String(linha[col.executante] ?? "").trim();
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

  return { servicos, avisos };
}
