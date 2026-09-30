// Exportação de tabela (histórico, etc.) para CSV e Excel — sem biblioteca
// nova: "xlsx" já é dependência do projeto (lib/import-planilha.ts a usa pra
// LER a planilha de programação semanal); aqui é a mesma biblioteca, só
// escrevendo em vez de ler. CSV não precisa de biblioteca nenhuma.
import * as XLSX from "xlsx";

function baixarBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Bloco H: caracteres que o Excel/Sheets/LibreOffice tratam como início de
// fórmula ao abrir um CSV ou ler uma célula de texto — "=", "+", "-", "@" e
// tab/CR (mitigação padrão OWASP para "CSV Injection"). Colunas como "Parada"
// e "Responsável" vêm de texto livre digitado por um editor (nome do
// relatório, nome de quem executou o serviço) e chegavam aqui sem nenhuma
// neutralização — um valor começando com um desses caracteres virava fórmula
// de verdade (inclusive =HYPERLINK, que vaza dado, ou fórmulas DDE em
// versões antigas do Excel) assim que alguém abrisse o arquivo exportado.
// Só se aplica a texto (string): número nunca carrega fórmula por
// construção, e prefixar um número negativo mudaria o tipo da célula no
// XLSX de numérico pra texto à toa.
const GATILHO_FORMULA = /^[=+\-@\t\r]/;

// Exportada (só visibilidade) pra poder testar a neutralização sem precisar
// simular Blob/DOM — o resto deste arquivo depende de APIs de navegador.
export function neutralizarFormula(valor: string): string {
  return GATILHO_FORMULA.test(valor) ? `'${valor}` : valor;
}

function paraCampoCsv(valor: string | number): string {
  const texto = typeof valor === "string" ? neutralizarFormula(valor) : String(valor);
  // ; e não , como separador: é o padrão do Excel em português (pt-BR usa
  // vírgula como separador decimal, então um CSV com vírgula como separador
  // de coluna faz o Excel confundir "12,5" com duas colunas).
  return /[";\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

export function exportarCsv(filename: string, colunas: string[], linhas: Array<Array<string | number>>): void {
  const texto = [colunas, ...linhas].map((linha) => linha.map(paraCampoCsv).join(";")).join("\r\n");
  // BOM UTF-8 na frente: sem ele o Excel assume Latin-1 e acentos viram lixo.
  const blob = new Blob(["﻿" + texto], { type: "text/csv;charset=utf-8" });
  baixarBlob(blob, filename);
}

export function exportarXlsx(filename: string, colunas: string[], linhas: Array<Array<string | number>>, nomeAba = "Dados"): void {
  const linhasSeguras = linhas.map((linha) => linha.map((v) => (typeof v === "string" ? neutralizarFormula(v) : v)));
  const planilha = XLSX.utils.aoa_to_sheet([colunas, ...linhasSeguras]);
  const livro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(livro, planilha, nomeAba);
  XLSX.writeFile(livro, filename);
}
