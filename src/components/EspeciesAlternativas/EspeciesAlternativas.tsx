import { useId } from 'react';
import { Check, ChevronRight } from 'lucide-react';
import type { PlantMatch } from '../../types/identify';
import { MAX_ALTERNATIVAS, TITULO } from './constants';

export interface EspeciesAlternativasProps {
  /** Candidatas devueltas por la identificación, en cualquier orden. */
  matches: PlantMatch[];
  /** Nombre científico de la especie elegida, o `null` si aún no hay elección. */
  selectedName: string | null;
  /** Se llama con el nombre científico de la fila que pulsa el usuario. */
  onSelect: (scientificName: string) => void;
  /** Abre la ficha de la candidata pulsada, si la pantalla lo permite. */
  onOpenMatch?: (match: PlantMatch) => void;
  /** Número máximo de filas a mostrar. Por defecto, `MAX_ALTERNATIVAS`. */
  max?: number;
  /** Cabecera de la sección. Por defecto, «¿No es esta? Otras posibles». */
  title?: string;
}

/** Confianza en porcentaje entero, como en el diseño (`82%`). */
function porcentaje(score: number): number {
  return Math.round(score * 100);
}

/**
 * UT F05 (RF18 · PA 689): lista de especies alternativas para cuando la
 * identificación no es concluyente. Muestra las candidatas **ordenadas de
 * mayor a menor confianza**, con su porcentaje y una barra proporcional, y
 * deja elegir una.
 *
 * Cada candidata es un botón de selección dentro de un `radiogroup`, con
 * estado anunciado y feedback de foco/selección también en pantallas táctiles.
 */
export function EspeciesAlternativas({
  matches,
  selectedName,
  onSelect,
  onOpenMatch,
  max = MAX_ALTERNATIVAS,
  title = TITULO,
}: EspeciesAlternativasProps) {
  const titleId = useId();
  const ordenadas = [...matches].sort((a, b) => b.score - a.score).slice(0, max);

  return (
    <section aria-labelledby={titleId} className="mt-5">
      <h2
        id={titleId}
        className="text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-500"
      >
        {title}
      </h2>

      <div role="radiogroup" aria-label={title} className="mt-2.5 flex flex-col gap-2">
        {ordenadas.map((match) => {
          const seleccionada = selectedName === match.scientificName;
          const pct = porcentaje(match.score);

          return (
              <button
                key={match.scientificName}
                type="button"
                role="radio"
                aria-checked={seleccionada}
                tabIndex={seleccionada || (selectedName === null && ordenadas[0] === match) ? 0 : -1}
                onClick={() => {
                  if (onOpenMatch !== undefined) {
                    onOpenMatch(match);
                  } else {
                    onSelect(match.scientificName);
                  }
                }}
                onKeyDown={(event) => {
                  const radios = Array.from(
                    event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="radio"]') ?? [],
                  );
                  const index = radios.indexOf(event.currentTarget);
                  let nextIndex: number | null = null;
                  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = (index + 1) % radios.length;
                  if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = (index - 1 + radios.length) % radios.length;
                  if (event.key === 'Home') nextIndex = 0;
                  if (event.key === 'End') nextIndex = radios.length - 1;
                  if (nextIndex !== null) {
                    event.preventDefault();
                    radios[nextIndex]?.focus();
                    const nextMatch = ordenadas[nextIndex];
                    if (nextMatch) {
                      if (onOpenMatch !== undefined) onOpenMatch(nextMatch);
                      else onSelect(nextMatch.scientificName);
                    }
                  }
                }}
                className={`flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-xl border py-2.5 pl-3.5 pr-3 text-left shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-800 focus-visible:ring-offset-2 ${seleccionada ? 'border-[#1f4d2e] bg-[#f2f7ec]' : 'border-neutral-200 bg-white'}`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold text-neutral-900">
                    {match.commonNames[0] !== undefined && (
                      <span className="sr-only">{match.commonNames[0]} </span>
                    )}
                    {match.scientificName}
                  </span>
                  <span
                    aria-hidden="true"
                    className="mt-1.5 block h-1 w-20 overflow-hidden rounded-full bg-neutral-200"
                  >
                    <span
                      className="block h-full rounded-full bg-[#1f4d2e]"
                      style={{ width: `${pct}%` }}
                    />
                  </span>
                </span>
                <span className="shrink-0 text-sm font-medium text-neutral-600">{pct}%</span>
                {seleccionada ? (
                  <Check
                    size={16}
                    className="shrink-0 text-[#1f4d2e]"
                    aria-hidden="true"
                  />
                ) : (
                  <ChevronRight
                    size={16}
                    className="shrink-0 text-neutral-400"
                    aria-hidden="true"
                  />
                )}
              </button>
          );
        })}
      </div>
    </section>
  );
}

export default EspeciesAlternativas;
