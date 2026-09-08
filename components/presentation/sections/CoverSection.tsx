"use client";

import Image from "next/image";
import type { ParadaResumo } from "@/lib/types";
import { MachineIllustration } from "@/components/ui/MachineIllustration";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { cn, formatDateCompact } from "@/lib/utils";

export function CoverSection({ resumo }: { resumo: ParadaResumo }) {
  const campos = [
    { label: "Data da Parada", value: formatDateCompact(resumo.data) },
    { label: "Tempo Planejado", value: resumo.duracaoPlanejada },
    { label: "Tempo Realizado", value: resumo.duracaoRealizada },
    { label: "Responsável", value: resumo.responsavel },
  ];

  return (
    <section
      id="capa"
      className="section-screen relative flex items-center overflow-hidden bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800 px-6 py-16 sm:px-10 sm:py-20 lg:py-24"
    >
      {/* Fundo tipo prancha técnica: malha fina de desenho industrial */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.35]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
      </div>
      <div className="pointer-events-none absolute -right-32 -top-32 h-[520px] w-[520px] rounded-full bg-brand-500/15 blur-3xl" />

      <Image
        src="/santher-logo-branco.png"
        alt="Santher"
        width={190}
        height={48}
        className="absolute left-6 top-6 h-10 w-auto sm:left-10 sm:top-10 sm:h-12"
        priority
      />

      <div className="relative mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-8 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
        <div>
          <div className="revelar mb-6 flex flex-wrap items-center gap-3">
            <StatusBadge
              status={resumo.status}
              className="rounded-sm border border-white/25 bg-white/[0.06] font-mono text-[11px] tracking-[0.08em] text-white [&>span]:bg-current"
            />
            {/* O id ganhou sufixo aleatorio e ficou longo demais pra caber
                aqui inteiro. Cortar no meio ("parada-mp11-util…") nao serve
                nem pra conferir nem pra ler; o que identifica de fato e o
                final, entao a etiqueta mostra so ele. O id completo continua
                no title, pra quem precisar. */}
            <span
              className="rounded-sm border border-white/10 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-brand-300"
              title={resumo.id}
            >
              Nº Registro {resumo.id.slice(-8)}
            </span>
          </div>

          <div className="revelar flex items-stretch gap-4" style={{ animationDelay: "0.15s" }}>
            <span className="mt-1 w-[3px] flex-none rounded-full bg-signal-500" />
            <div className="min-w-0">
              {/* O espacamento entre letras de 0.32em e o que da o ar de
                  prancha tecnica, mas no celular ele estica a linha a ponto de
                  ela quebrar deixando "DIGITAL" sozinho embaixo. Menos
                  espacamento no estreito mantem a intencao sem a quebra feia. */}
              <p className="mb-2 font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-brand-300 sm:tracking-[0.32em]">
                {resumo.area} · Relatório Digital
              </p>
              <h1 className="font-display text-4xl font-semibold uppercase leading-[0.98] tracking-tight text-white sm:text-5xl lg:text-[3.4rem]">
                {resumo.nome}
              </h1>
              <p className="mt-4 text-lg font-medium text-brand-200">{resumo.maquina}</p>
            </div>
          </div>

          <div
            className="revelar mt-10 grid grid-cols-2 overflow-hidden rounded-md border border-white/15 bg-white/[0.03] sm:grid-cols-4"
            style={{ animationDelay: "0.3s" }}
          >
            {campos.map(({ label, value }, i) => (
              <div
                key={label}
                className={cn(
                  "min-w-0 border-white/10 px-4 py-3.5 align-top",
                  i % 2 === 1 && "max-sm:border-l",
                  i >= 2 && "max-sm:border-t",
                  i > 0 && "sm:border-l"
                )}
              >
                <p className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-brand-300">{label}</p>
                {/* Quebra em vez de truncar: um nome cortado ("Madson Ferna…")
                    nao informa nada, e a faixa tem altura de sobra pra duas
                    linhas. As celulas se alinham pelo topo, entao uma que
                    quebre nao desalinha as vizinhas. */}
                <p className="mt-1 font-mono text-sm font-semibold leading-snug text-white [overflow-wrap:anywhere]">
                  {value}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div
          // A foto vinha ANTES do titulo no celular (-order-1). O efeito era
          // que quem abre o QR code no aparelho recebia uma foto ocupando a
          // tela inteira e precisava rolar pra descobrir de que relatorio se
          // trata — medido: o titulo comecava em 507px. Numa capa, o nome vem
          // primeiro; a foto ilustra o que o nome ja disse. Em telas largas as
          // duas colunas aparecem lado a lado e a ordem nao muda nada.
          // No celular a foto ocupa a largura toda, alinhada com o titulo e com
          // a faixa de campos acima dela. Antes era mx-auto com teto de 320px:
          // uma caixa estreita centralizada, enquanto TODO o resto da capa
          // encosta a esquerda. O desencontro entre um bloco centralizado e
          // tudo o mais alinhado a esquerda e o que faz a capa parecer torta.
          //
          // Em telas largas ela volta a ser um quadrado centralizado na propria
          // coluna, porque ali a capa tem duas colunas lado a lado e o
          // enquadramento quadrado equilibra o bloco de texto.
          //
          // A proporcao tambem muda: 4/3 no estreito em vez de quadrado, senao
          // uma foto de largura total viraria um bloco altissimo e empurraria o
          // resto da capa pra fora da tela.
          className="revelar-foto relative aspect-[4/3] w-full lg:mx-auto lg:aspect-square lg:max-w-md"
          style={{ animationDelay: "0.3s" }}
        >
          {resumo.fotosMaquina?.length ? (
            <div className="relative h-full w-full">
              <div className="absolute inset-0 overflow-hidden rounded-lg border border-white/20 shadow-2xl">
                <Image src={resumo.fotosMaquina[0]} alt={resumo.maquina} fill sizes="480px" className="object-cover" priority />
                <div className="absolute inset-0 bg-gradient-to-t from-brand-950/50 via-transparent to-transparent" />
              </div>
              <span className="absolute -bottom-px -left-px h-3 w-3 border-b-2 border-l-2 border-signal-500" />
              <span className="absolute -right-px -top-px h-3 w-3 border-r-2 border-t-2 border-signal-500" />
              <div className="absolute bottom-3 left-3 rounded-sm bg-brand-950/70 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-brand-200 backdrop-blur-sm">
                Registro Fotográfico
              </div>
              {resumo.fotosMaquina[1] && (
                <div className="absolute -bottom-6 -right-6 h-32 w-40 overflow-hidden rounded-md border-4 border-brand-900 shadow-2xl sm:h-36 sm:w-48">
                  <Image src={resumo.fotosMaquina[1]} alt={resumo.maquina} fill sizes="200px" className="object-cover" />
                </div>
              )}
            </div>
          ) : (
            <div className="relative flex h-full w-full items-center justify-center rounded-lg border border-white/15 bg-white/5 p-12 backdrop-blur-sm">
              <MachineIllustration variant={resumo.imagem} className="h-full w-full" />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
