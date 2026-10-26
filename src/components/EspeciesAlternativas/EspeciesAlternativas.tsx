import { useId } from 'react';
import { Trees } from 'lucide-react';
import type { PlantMatch } from '../../types/identify';
import {
  ETIQUETA_MUY_PARECIDO,
  MAX_ALTERNATIVAS,
  MUY_PARECIDO,
  SUBTITULO,
  TITULO,
} from './constants';

export interface EspeciesAlternativasProps {
  /** Candidatas devueltas por la identificación, en cualquier orden. */
  matches: PlantMatch[];
  /** Nombre científico de la especie elegida, o `null` si aún no hay elección. */
  selectedName: string | null;
  /** Se llama con el nombre científico de la tarjeta que pulsa el usuario. */
  onSelect: (scientificName: string) => void;
  /** Número máximo de tarjetas a mostrar. Por defecto, `MAX_ALTERNATIVAS`. */
  max?: number;
  /** Cabecera de la sección. Por defecto, «Especies alternativas». */
  title?: string;
  /** Texto de apoyo bajo la cabecera. Por defecto, «Posibles alternativas». */
  subtitle?: string;
}

/** Nombre visible de la especie: el común si existe y, si no, el científico. */
function nombreVisible(match: PlantMatch): string {
  return match.commonNames[0] ?? match.scientificName;
}

/** Confianza en porcentaje entero, como en el diseño (`92% de confianza`). */
function porcentaje(score: number): string {
  return `${Math.round(score * 100)}% de confianza`;
}

/**
 * UT F05 (RF18 · PA 689): lista de especies alternativas para cuando la
 * identificación no es concluyente. Muestra las candidatas **ordenadas de
 * mayor a menor confianza**, con su porcentaje, y deja elegir una.
 *
 * Es un `radiogroup` nativo (inputs `radio` ocultos tras la tarjeta), así que
 * se navega con las flechas y las etiquetas quedan asociadas sin ARIA extra.
 */
export function EspeciesAlternativas({
  matches,
  selectedName,
  onSelect,
  max = MAX_ALTERNATIVAS,
  title = TITULO,
  subtitle = SUBTITULO,
}: EspeciesAlternativasProps) {
  const groupName = useId();
  const titleId = useId();
  const ordenadas = [...matches].sort((a, b) => b.score - a.score).slice(0, max);

  return (
    <section aria-labelledby={titleId} className="mt-4">
      <h2 id={titleId} className="text-lg font-bold text-neutral-900">
        {title}
      </h2>
      <p className="mt-0.5 text-sm text-neutral-500">{subtitle}</p>

      <div role="radiogroup" aria-label={title} className="mt-3 flex flex-col gap-2">
        {ordenadas.map((match) => (
          <label key={match.scientificName} className="block">
            <input
              type="radio"
              name={groupName}
              className="peer sr-only"
              checked={selectedName === match.scientificName}
              onChange={() => onSelect(match.scientificName)}
            />
            <span className="flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-3 py-2.5 shadow-sm transition-colors hover:border-emerald-300 peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-700 peer-focus-visible:ring-offset-2 peer-checked:border-emerald-700 peer-checked:bg-emerald-50">
              <span
                aria-hidden="true"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"
              >
                <Trees size={22} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-neutral-900">
                  {nombreVisible(match)}
                </span>
                {match.commonNames.length > 0 && (
                  <span className="block truncate text-xs italic text-neutral-500">
                    {match.scientificName}
                  </span>
                )}
              </span>
              <span className="flex shrink-0 flex-col items-end gap-1">
                <span className="text-sm font-medium text-neutral-700">
                  {porcentaje(match.score)}
                </span>
                {match.score >= MUY_PARECIDO && (
                  <span className="rounded-full bg-emerald-700 px-2 py-0.5 text-[11px] font-medium text-white">
                    {ETIQUETA_MUY_PARECIDO}
                  </span>
                )}
              </span>
            </span>
          </label>
        ))}
      </div>
    </section>
  );
}

export default EspeciesAlternativas;
