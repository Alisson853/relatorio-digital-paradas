# Varredura de dependências

Rodada em 2026-09-08 com `npm audit`. Resultado inicial: **7 alertas — 3 altos, 4
moderados.** Depois da correção do `xlsx`: **6 — 2 altos, 4 moderados.**

Nenhum deles se resolve subindo de versão, e isso não é preguiça de quem
escreveu: em dois casos a versão corrigida não existe no npm, e no terceiro o
`npm audit fix` propõe um *downgrade* de major que quebraria o app. O que segue
é o que cada um significa aqui dentro e o que foi feito a respeito.

Pra repetir a varredura:

    npm audit

---

## 1. xlsx — ALTO — prototype pollution + ReDoS — RESOLVIDO

**Onde entra:** `lib/import-planilha.ts`, na importação de planilha da tela
`/novo`. `XLSX.read()` recebe o arquivo que a pessoa escolheu.

**Onde roda:** no navegador. `app/novo/page.tsx` é `"use client"`, então o
parser nunca toca o servidor — o estrago possível fica dentro da aba de quem
abriu a planilha, e essa pessoa já é um editor autenticado com poder de
escrita. Isso reduz muito a gravidade, mas não zera: prototype pollution na aba
é caminho pra XSS, e a aba tem sessão aberta.

**Por que o npm não resolve:** a SheetJS saiu do npm. A versão publicada lá
parou em `0.18.5`, que é a vulnerável; as correções só existem no CDN próprio.

**Correção aplicada:**

    npm i https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz

É por isso que o `package.json` traz uma URL no lugar de um número de versão
nesta dependência — não é descuido, é o único lugar onde a versão corrigida
existe. Quem for atualizar no futuro precisa trocar a URL, não o intervalo de
versão; um `^0.20.3` faria o npm voltar pro pacote abandonado e vulnerável.

A API não mudou (`XLSX.read`, `XLSX.utils.sheet_to_json`), então não houve
mudança de código. Conferido gerando uma planilha com os cabeçalhos que
`parsePlanilhaServicos` espera e importando: 2 serviços lidos, equipe e
executante corretos, "TRABALHOS PROGRAMADOS" e "ETIQUETA VERMELHA" extraídos.

**Defesa que continua valendo:** a tela recusa arquivo acima de 15 MB e qualquer
coisa que não termine em `.xlsx/.xlsm/.xls` antes de entregar ao parser
(`handleImportarPlanilha`).

---

## 2. image-size — ALTO — laço infinito nos parsers ICNS, JXL e HEIF

**Onde entra:** `app/api/export/rtf/[id]/route.ts`, pra descobrir a dimensão
das fotos ao montar o RTF. Roda no **servidor**, o que aqui é o agravante: um
laço infinito trava a função até o timeout, consumindo o tempo de execução.

**Por que o npm não resolve:** `2.0.2` é a versão mais recente publicada e é a
que está marcada. Não há correção lançada. O `npm audit fix` sugere descer
`pptxgenjs` de `4.x` pra `1.1.5` — sete anos atrás, API completamente outra.
Não é uma opção.

**Mitigação aplicada:** o parser só é vulnerável nos formatos ICNS, JXL e HEIF,
e nenhum deles consegue mais entrar no sistema. `uploadFoto()` agora decide o
tipo pelos **bytes iniciais** do arquivo (`detectarImagem`, em
`lib/validation.ts`) e aceita exclusivamente JPEG, PNG e WebP — o que o
`image-size` recebe no export vem sempre do nosso próprio Blob, e o Blob só
tem esses três. Um ICNS não chega lá porque não passa da porta de entrada.

Vale revisar isso se um dia o upload for afrouxado.

---

## 3. esbuild 0.18.20, via @esbuild-kit → drizzle-kit — MODERADO (4 alertas)

**Onde entra:** `drizzle-kit`, que é **devDependency**. Não vai pro build, não
vai pro deploy, não existe em produção.

**O que a falha permite:** enquanto o *dev server do esbuild* estiver no ar,
qualquer site aberto no mesmo navegador pode fazer requisições a ele e ler a
resposta. O `drizzle-kit` usa o esbuild só pra compilar o arquivo de config —
nunca sobe o dev server —, então o cenário do alerta não acontece aqui.

**Por que não foi corrigido:** tentei um `overrides` forçando `esbuild@^0.25`
dentro de `@esbuild-kit/core-utils`; o npm aceita a declaração mas continua
instalando `0.18.20` (o pacote está arquivado e prende a versão), e a árvore
fica marcada como `invalid`. Um override que não pega é pior que nenhum, então
foi revertido. O `@esbuild-kit/*` está deprecado e o próprio `drizzle-kit` já
carrega `tsx` em paralelo; a expectativa é isso sair sozinho numa versão futura.

**Situação:** risco aceito, dev-only. Reavaliar quando sair `drizzle-kit` novo.
