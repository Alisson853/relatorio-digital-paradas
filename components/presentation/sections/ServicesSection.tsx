"use client";

import { useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, ChevronLeft, ChevronRight, Clock, MapPin, Search, Users2, Wrench, X, Zap } from "lucide-react";
import type { Servico } from "@/lib/types";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { PhotoLightbox } from "@/components/presentation/PhotoLightbox";
import { NO_PHOTO_PLACEHOLDER } from "@/lib/image-utils";
import { servicosComFoto } from "@/lib/derive";
import { cn } from "@/lib/utils";

function MetaField({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 break-words text-sm font-semibold leading-snug text-slate-800">{value}</p>
    </div>
  );
}

// Etiqueta Vermelha/Amarela sinalizam risco de segurança — precisam saltar aos
// olhos de quem está lendo, não só aparecer como mais um texto no meio do card.
function CategoriaBadge({ categoria }: { categoria?: string }) {
  if (!categoria) return null;
  const estilo =
    categoria === "Etiqueta Vermelha"
      ? "bg-danger-100 text-danger-600"
      : categoria === "Etiqueta Amarela"
        ? "bg-warning-100 text-warning-600"
        : "bg-slate-100 text-slate-600";
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide", estilo)}>
      {(categoria === "Etiqueta Vermelha" || categoria === "Etiqueta Amarela") && <AlertTriangle size={12} />}
      {categoria}
    </span>
  );
}

function ServiceSlide({ servico }: { servico: Servico }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const fotosDisponiveis = [
    ...(servico.fotoAntes && servico.fotoAntes !== NO_PHOTO_PLACEHOLDER
      ? [{ key: "antes", url: servico.fotoAntes, label: "Antes", horario: servico.fotoAntesHorario, badge: "bg-slate-900/80" }]
      : []),
    ...(servico.fotoDurante
      ? [{ key: "durante", url: servico.fotoDurante, label: "Durante", horario: servico.fotoDuranteHorario, badge: "bg-warning-600/90" }]
      : []),
    ...(servico.fotoDepois && servico.fotoDepois !== NO_PHOTO_PLACEHOLDER
      ? [{ key: "depois", url: servico.fotoDepois, label: "Depois", horario: servico.fotoDepoisHorario, badge: "bg-brand-600/90" }]
      : []),
  ];
  const mostrarRotulo = fotosDisponiveis.length > 1;

  return (
    <div className="grid grid-rows-[minmax(0,1fr)] flex-1 grid-cols-1 gap-8 overflow-hidden lg:grid-cols-[1fr_1.05fr] lg:gap-10">
      {/* O painel tem altura fixa pra secao caber na tela, entao o texto do
          servico rola por dentro. Sem sinal nenhum isso lia como conteudo
          cortado (o titulo "Problema Identificado" aparecia partido na borda).
          A mascara desvanece as ultimas linhas, que e como o olho reconhece
          "tem mais abaixo".

          O padding de baixo e igual a altura do desvanecimento de proposito:
          assim, quando o texto chega ao fim, quem esta sob a mascara e o
          espaco vazio, nao a ultima frase. Sem isso a solucao do corte criaria
          outro problema — a linha final permanentemente apagada. */}
      <div className="min-h-0 overflow-y-auto pb-10 pr-1 [mask-image:linear-gradient(to_bottom,black_calc(100%-2.5rem),transparent)]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-brand-600">
            Serviços Executados
          </span>
          <StatusBadge status={servico.status} />
        </div>

        <h3 className="break-words text-xl font-bold uppercase leading-tight tracking-tight text-slate-900 sm:text-2xl lg:text-3xl">
          {servico.titulo}
        </h3>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {servico.numeroOS === "Oportunidade" ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-signal-500/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-signal-500">
              <Zap size={12} />
              Oportunidade — sem OS programada
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-600">
              OS {servico.numeroOS}
            </span>
          )}
          <CategoriaBadge categoria={servico.categoria} />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-4">
          <MetaField label="Equipamento" value={servico.equipamento} className="col-span-2 sm:col-span-4" />
          <div className="col-span-2 flex items-start gap-1.5 sm:col-span-2">
            <MapPin size={13} className="mt-4 flex-none text-slate-400" />
            <MetaField label="Local" value={servico.area} />
          </div>
          <div className="col-span-2 flex items-start gap-1.5 sm:col-span-2">
            <Users2 size={13} className="mt-4 flex-none text-slate-400" />
            <MetaField label="Área Responsável" value={`${servico.equipe} · ${servico.responsavel}`} />
          </div>
          <div className="col-span-1 flex items-start gap-1.5 sm:col-span-2">
            <Clock size={13} className="mt-4 flex-none text-slate-400" />
            <MetaField label="Tempo Total" value={servico.tempoGasto} />
          </div>
          {(servico.horaInicio || servico.horaFim) && (
            <div className="col-span-1 flex items-start gap-1.5 sm:col-span-2">
              <Clock size={13} className="mt-4 flex-none text-slate-400" />
              <MetaField label="Início — Término" value={`${servico.horaInicio || "—"} — ${servico.horaFim || "—"}`} />
            </div>
          )}
        </div>

        <div className="mt-6 space-y-4 text-sm">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-brand-600">Problema Identificado</p>
            <p className="mt-1 leading-relaxed text-slate-600">{servico.problemaIdentificado}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-brand-600">O Que Foi Feito</p>
            <p className="mt-1 leading-relaxed text-slate-600">{servico.servicoExecutado}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-brand-600">Resultado</p>
            <p className="mt-1 leading-relaxed text-slate-600">{servico.resultado}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-3xl border-2 border-brand-100 bg-brand-50/40 p-3 sm:p-4 lg:h-full">
        {/* Grade de 2 colunas (1 só quando há uma única foto), cada célula
            preenchendo igualmente a altura disponível (auto-rows-fr) — ao
            contrário de empilhar em 1 coluna só (o que dava caixas largas
            e baixas demais com 3 fotos) ou forçar quadrado perfeito (o que
            limitava o tamanho ao menor dos dois lados), essa grade mantém
            a proporção de cada caixa perto da proporção do próprio painel,
            então fica grande e sem cortar demais em nenhum sentido. */}
        <div
          className={cn(
            // A altura vem de h-full, que so existe porque o cartao tem
            // lg:h-[90vh] no desktop. No celular nao ha altura nenhuma pra
            // herdar: o grid colapsa, e como as imagens usam fill, elas
            // somem junto — o painel de fotos vira uma capsula vazia no meio
            // do cartao. Uma altura propria no estreito devolve as fotos e
            // mantem o resto do calculo (auto-rows-fr dividindo o espaco)
            // exatamente como estava.
            "grid h-[46vh] auto-rows-fr gap-3 lg:h-full",
            fotosDisponiveis.length === 1 ? "grid-cols-1" : "grid-cols-2"
          )}
        >
          {fotosDisponiveis.map((foto, i) => (
            <button
              key={foto.key}
              type="button"
              onClick={() => setLightboxIndex(i)}
              aria-label={`Ampliar foto ${foto.label}`}
              className={cn(
                "group relative overflow-hidden rounded-2xl border-2 border-white bg-slate-100 shadow-md",
                // Com tres fotos, a grade de duas colunas deixava a quarta
                // celula vazia — um buraco no canto, bem no painel que a
                // reuniao fica olhando. A ultima passa a ocupar a linha
                // inteira: fecha o vazio e, como a ordem e Antes/Durante/
                // Depois, quem ganha a faixa larga e justamente o Depois,
                // que e o resultado do servico.
                fotosDisponiveis.length === 3 && i === 2 && "col-span-2"
              )}
            >
              <Image
                src={foto.url}
                alt={servico.equipamento}
                fill
                sizes="(min-width: 1024px) 480px, (min-width: 640px) 320px, 90vw"
                className="object-cover transition-transform duration-500 group-hover:scale-110"
                loading="eager"
                unoptimized={foto.url.startsWith("data:")}
              />
              {mostrarRotulo && (
                <span
                  className={cn(
                    "absolute left-3 top-3 flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white",
                    foto.badge
                  )}
                >
                  {foto.label}
                  {foto.horario && <span className="font-mono normal-case opacity-80">· {foto.horario}</span>}
                </span>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-opacity group-hover:bg-black/10 group-hover:opacity-100">
                <Search size={22} className="text-white drop-shadow" />
              </div>
            </button>
          ))}
        </div>
      </div>

      <PhotoLightbox
        photos={fotosDisponiveis.map((f) => ({ id: f.key, url: f.url, label: f.label }))}
        activeIndex={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onNavigate={setLightboxIndex}
      />
    </div>
  );
}

// Um filtro é só um rótulo (pro chip e pra mensagem de vazio) mais um
// predicado — não precisou virar um union type de "categoria | equipe |
// status" porque quem monta o filtro (PresentationView, a partir do clique
// num card do Resumo) já sabe exatamente o que quer comparar.
export interface FiltroServicos {
  label: string;
  predicate: (s: Servico) => boolean;
}

interface Props {
  servicos: Servico[];
  // Setado quando alguém chega aqui clicando num card do Resumo Executivo
  // (Etiqueta Vermelha/Amarela, OS Concluídas, OS por equipe...) — estreita
  // o carrossel só ao que aquele número representa, em vez de precisar
  // passar por todas as OS pra achá-las.
  filtro?: FiltroServicos | null;
  onLimparFiltro?: () => void;
}

export function ServicesSection({ servicos: todosServicos, filtro, onLimparFiltro }: Props) {
  const [index, setIndex] = useState(0);
  const comFoto = servicosComFoto(todosServicos);
  const servicos = filtro ? comFoto.filter(filtro.predicate) : comFoto;
  const total = servicos.length;
  const atual = servicos[index];

  // Volta pro início do carrossel sempre que o filtro muda — senão o índice
  // de antes (ex: 5) pode não existir mais na lista filtrada (que tem só 2),
  // e a tela mostraria o card errado ou nenhum. Ajustado durante o render
  // (não num useEffect) seguindo o padrão do próprio React pra "resetar
  // estado quando uma prop muda" — evita o efeito colateral disparar um
  // segundo render depois que o primeiro já mostrou o índice errado.
  const [filtroVisto, setFiltroVisto] = useState(filtro);
  if (filtro !== filtroVisto) {
    setFiltroVisto(filtro);
    setIndex(0);
  }

  const goPrev = () => setIndex((i) => Math.max(0, i - 1));
  const goNext = () => setIndex((i) => Math.min(total - 1, i + 1));

  const chipFiltro = filtro && (
    <button
      type="button"
      onClick={onLimparFiltro}
      className="mb-4 flex items-center gap-1.5 rounded-full bg-brand-600 px-3.5 py-1.5 text-xs font-bold text-white transition-colors hover:bg-brand-700"
    >
      Filtrando: {filtro.label}
      <X size={13} />
    </button>
  );

  if (total === 0 || !atual) {
    const temServicosSemFoto = todosServicos.length > 0;
    return (
      <section id="servicos" className="section-screen flex items-center bg-slate-50 px-6 py-24 sm:px-10">
        <div className="mx-auto w-full max-w-6xl">
          {chipFiltro}
          <SectionHeading
            eyebrow="Serviços Executados"
            title={filtro ? `Nenhuma OS em ${filtro.label}` : "Nenhum Serviço Registrado"}
            description={
              filtro
                ? "Nenhum dos serviços com foto desta parada está nessa condição."
                : temServicosSemFoto
                  ? "As OS desta parada ainda não têm foto — assim que a primeira for enviada, o serviço aparece aqui."
                  : "Nenhuma ordem de serviço foi cadastrada para esta parada."
            }
          />
          <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-slate-200 bg-white py-20 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <Wrench size={22} />
            </div>
            <p className="text-sm font-medium text-slate-400">
              {filtro
                ? "Experimente limpar o filtro pra ver todos os serviços."
                : temServicosSemFoto
                  ? `${todosServicos.length} OS aguardando foto para entrar na apresentação.`
                  : "Nenhum serviço foi adicionado a este relatório."}
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="servicos" className="section-screen flex items-center bg-slate-50 px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-7xl">
        {chipFiltro}
        <div className="relative flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_4px_24px_rgba(16,24,40,0.06)] sm:p-10 lg:h-[90vh]">
          <div className="absolute inset-y-0 left-0 w-1.5 bg-brand-600" />

          {/* initial={false} desliga a animacao de entrada do PRIMEIRO cartao.
              A troca entre servicos continua deslizando; o que deixa de existir
              e o estado inicial invisivel na montagem — que estava travando o
              cartao em opacity:0 e deixando a secao inteira em branco, com so a
              moldura e o "1/16" aparecendo. Mesmo se a animacao voltasse a
              funcionar, animar a entrada do primeiro item so atrasa a leitura:
              ninguem viu de onde ele veio. */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={atual.id}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="flex min-h-0 flex-1 flex-col"
            >
              <ServiceSlide servico={atual} />
            </motion.div>
          </AnimatePresence>

          <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-5">
            <p className="text-xs font-semibold text-slate-400">Relatório da Parada de Manutenção</p>
            <div className="flex items-center gap-3">
              <button
                onClick={goPrev}
                disabled={index === 0}
                aria-label="Serviço anterior"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-30"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-bold text-slate-700">
                {index + 1}/{total}
              </span>
              <button
                onClick={goNext}
                disabled={index === total - 1}
                aria-label="Próximo serviço"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-white transition-colors hover:bg-brand-700 disabled:opacity-30"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
