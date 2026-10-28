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
 * Es un `radiogroup` nativo (inputs `radio` ocultos tras la fila), así que se
 * navega con las flechas y las etiquetas quedan asociadas sin ARIA extra.
 */
export function EspeciesAlternativas({
  matches,
  selectedName,
  onSelect,
  max = MAX_ALTERNATIVAS,
  title = TITULO,
}: EspeciesAlternativasProps) {
  const groupName = useId();
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
            <label key={match.scientificName} className="block">
              <input
                type="radio"
                name={groupName}
                className="peer sr-only"
                checked={seleccionada}
                onChange={() => onSelect(match.scientificName)}
              />
              <span className="flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-xl border border-neutral-200 bg-white py-2.5 pl-3.5 pr-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors peer-checked:border-[#1f4d2e] peer-checked:bg-[#f2f7ec] peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-800 peer-focus-visible:ring-offset-2">
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
              </span>
            </label>
          );
        })}
      </div>
    </section>
  );
}

export default EspeciesAlternativas;
