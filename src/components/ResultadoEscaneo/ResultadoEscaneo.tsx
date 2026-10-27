import { ArrowLeft, Sprout } from 'lucide-react';
import type { PlantMatch } from '../../types/identify';
import {
  BOTON_VER_FICHA,
  CERTEZA_ALTA,
  CERTEZA_BAJA,
  CERTEZA_MEDIA,
  CONFIANZA_ALTA,
  CONFIANZA_MINIMA,
  CONFIRMACION_ELECCION,
  EspeciesAlternativas,
  ETIQUETA_ESPECIE_MAS_PROBABLE,
  ETIQUETA_TU_FOTO,
  MAX_ALTERNATIVAS,
  PIE_IDENTIFICACION,
  SIN_COINCIDENCIAS,
  TEXTO_REPETIR_FOTO,
} from '../EspeciesAlternativas';

export interface ResultadoEscaneoProps {
  /** Foto capturada o elegida de la galería, si la hay. */
  photoUrl: string | null;
  /** Especies devueltas por Pl@ntNet, en cualquier orden. */
  matches: PlantMatch[];
  /** Nombre científico de la alternativa elegida, o `null`. */
  selectedName?: string | null;
  /** Selecciona una de las alternativas de la lista. */
  onSelectAlternative?: (scientificName: string) => void;
  /**
   * Abre la ficha de la especie más probable. Si no se pasa, el botón «Ver
   * ficha» no se pinta (por ejemplo, en pantallas sin navegación a la ficha).
   */
  onOpenPrimary?: (match: PlantMatch) => void;
  /** Vuelve a la pantalla anterior. */
  onBack: () => void;
  /** Descarta el resultado y vuelve a hacer la foto. */
  onRepeatPhoto: () => void;
  /** Número máximo de alternativas. Por defecto, `MAX_ALTERNATIVAS`. */
  maxAlternatives?: number;
}

/** Confianza en porcentaje entero, como en el diseño (`82%`). */
function porcentaje(score: number): number {
  return Math.round(score * 100);
}

/** Texto de certeza de la especie principal, con su tono. */
function certeza(score: number): { texto: string; tono: string } {
  if (score >= CONFIANZA_ALTA) {
    return { texto: CERTEZA_ALTA, tono: 'text-neutral-500' };
  }
  if (score >= CONFIANZA_MINIMA) {
    return { texto: CERTEZA_MEDIA, tono: 'text-neutral-500' };
  }
  return { texto: CERTEZA_BAJA, tono: 'text-amber-700' };
}

/** Nombre común y familia bajo el nombre científico (`Jacaranda · Bignoniaceae`). */
function subtitulo(match: PlantMatch): string | null {
  const partes = [match.commonNames[0], match.family].filter(
    (parte): parte is string => typeof parte === 'string' && parte.length > 0,
  );
  return partes.length > 0 ? partes.join(' · ') : null;
}

/**
 * UT F05 (RF18 · PA 689): resultado del escaneo de una planta con el diseño de
 * la ficha: la foto ocupa la cabecera y, debajo, la especie más probable con su
 * porcentaje y la lista de alternativas de Pl@ntNet.
 *
 * La especie principal siempre se puede abrir en la ficha; las alternativas se
 * seleccionan para elegir cuál es la planta de la foto.
 */
export function ResultadoEscaneo({
  photoUrl,
  matches,
  selectedName = null,
  onSelectAlternative,
  onOpenPrimary,
  onBack,
  onRepeatPhoto,
  maxAlternatives = MAX_ALTERNATIVAS,
}: ResultadoEscaneoProps) {
  // Si quien usa el resultado no ofrece selección, las filas siguen siendo
  // navegables pero no cambian nada.
  const seleccionar = onSelectAlternative ?? (() => {});
  const ordenadas = [...matches].sort((a, b) => b.score - a.score);
  const principal = ordenadas[0] ?? null;
  const alternativas = ordenadas.slice(1, 1 + maxAlternatives);
  const detalles = principal !== null ? subtitulo(principal) : null;
  const nivel = principal !== null ? certeza(principal.score) : null;
  const pct = principal !== null ? porcentaje(principal.score) : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Resultado de la identificación"
      className="fixed inset-0 z-[65] flex justify-center overflow-y-auto bg-neutral-950"
    >
      <div className="flex min-h-full w-full max-w-md flex-col bg-white text-neutral-900">
        <header className="relative h-48 shrink-0 overflow-hidden bg-[#7d9b58]">
          {photoUrl !== null ? (
            <img
              src={photoUrl}
              alt="Foto escaneada de la planta"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-white/80">
              <Sprout size={64} strokeWidth={1.3} aria-hidden="true" />
            </div>
          )}
          {photoUrl !== null && (
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/25"
            />
          )}

          <button
            type="button"
            onClick={onBack}
            autoFocus
            aria-label="Volver"
            className="absolute left-4 top-[max(16px,env(safe-area-inset-top))] flex h-10 w-10 items-center justify-center rounded-full bg-white text-neutral-800 shadow-md transition-colors hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#7d9b58]"
          >
            <ArrowLeft size={20} strokeWidth={2.2} aria-hidden="true" />
          </button>

          <span className="absolute bottom-3 left-4 rounded-full bg-[#123a25] px-3 py-1 text-[11px] font-medium text-white shadow-sm">
            {ETIQUETA_TU_FOTO}
          </span>
        </header>

        <div className="flex-1 px-4 pb-6 pt-4">
          <h1 className="sr-only">Resultado de la identificación</h1>

          {principal === null ? (
            <p
              role="status"
              className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600"
            >
              {SIN_COINCIDENCIAS}
            </p>
          ) : (
            <section aria-labelledby="especie-mas-probable">
              <h2
                id="especie-mas-probable"
                className="text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-500"
              >
                {ETIQUETA_ESPECIE_MAS_PROBABLE}
              </h2>

              <article className="mt-2.5 rounded-2xl border-2 border-[#1f4d2e] bg-white p-3.5 shadow-sm">
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#e7efdd] text-[#1f4d2e]"
                  >
                    <Sprout size={26} strokeWidth={1.7} />
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="break-words text-[17px] font-bold leading-snug text-neutral-900">
                      {principal.scientificName}
                    </p>
                    {detalles !== null && (
                      <p className="mt-0.5 break-words text-xs leading-snug text-neutral-500">
                        {detalles}
                      </p>
                    )}
                  </div>

                  <p className="shrink-0 text-[22px] font-bold leading-none text-[#1f4d2e]">
                    {pct}%
                  </p>
                </div>

                <div
                  role="progressbar"
                  aria-label={`Certeza de ${principal.scientificName}`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={pct ?? 0}
                  className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#e7efdd]"
                >
                  <div
                    className="h-full rounded-full bg-[#1f4d2e]"
                    style={{ width: `${pct ?? 0}%` }}
                  />
                </div>
                {nivel !== null && (
                  <p className={`mt-1.5 text-xs font-medium ${nivel.tono}`}>{nivel.texto}</p>
                )}

                {onOpenPrimary !== undefined && (
                  <button
                    type="button"
                    onClick={() => onOpenPrimary(principal)}
                    className="mt-3 flex min-h-12 w-full items-center justify-center rounded-lg bg-[#1f4d2e] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#173c24] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-800 focus-visible:ring-offset-2"
                  >
                    {BOTON_VER_FICHA}
                  </button>
                )}
              </article>
            </section>
          )}

          {alternativas.length > 0 && (
            <EspeciesAlternativas
              matches={alternativas}
              selectedName={selectedName ?? null}
              onSelect={seleccionar}
              max={maxAlternatives}
            />
          )}

          {selectedName !== null && selectedName !== undefined && (
            <p role="status" className="mt-3 text-sm font-medium text-[#1f4d2e]">
              {CONFIRMACION_ELECCION}: {selectedName}
            </p>
          )}

          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={onRepeatPhoto}
              className="inline-flex min-h-12 items-center justify-center rounded-lg px-4 text-sm font-semibold text-[#1f4d2e] transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-800"
            >
              {TEXTO_REPETIR_FOTO}
            </button>
          </div>
        </div>

        <footer className="mt-auto flex items-start gap-2.5 border-t border-neutral-100 bg-neutral-50 px-4 py-4 text-[11px] leading-snug text-neutral-500">
          <span
            aria-hidden="true"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white text-[#1f4d2e] shadow-sm"
          >
            <Sprout size={14} strokeWidth={2} />
          </span>
          <p>{PIE_IDENTIFICACION}</p>
        </footer>
      </div>
    </div>
  );
}

export default ResultadoEscaneo;
