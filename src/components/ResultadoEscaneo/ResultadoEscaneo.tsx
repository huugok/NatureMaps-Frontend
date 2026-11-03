import { ArrowLeft, Sprout } from 'lucide-react';
import { useApp } from '../../context/useApp';
import type { PlantMatch } from '../../types/identify';
import {
  CONFIANZA_ALTA,
  CONFIANZA_MINIMA,
  EspeciesAlternativas,
  MAX_ALTERNATIVAS,
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
   * ficha» no se pinta. También abre la ficha de la candidata alternativa
   * cuando se pulsa una fila.
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

/** Clave de certeza de la especie principal. */
function nivelCerteza(score: number): 'result.high' | 'result.medium' | 'result.low' {
  if (score >= CONFIANZA_ALTA) return 'result.high';
  if (score >= CONFIANZA_MINIMA) return 'result.medium';
  return 'result.low';
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
  const { t } = useApp();
  // Si quien usa el resultado no ofrece selección, las filas siguen siendo
  // navegables pero no cambian nada.
  const seleccionar = onSelectAlternative ?? (() => {});
  const ordenadas = [...matches].sort((a, b) => b.score - a.score);
  const principal = ordenadas[0] ?? null;
  const alternativas = ordenadas.slice(1, 1 + maxAlternatives);
  const detalles = principal !== null ? subtitulo(principal) : null;
  const nivel = principal !== null ? nivelCerteza(principal.score) : null;
  const pct = principal !== null ? porcentaje(principal.score) : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('result.title')}
      className="absolute inset-0 z-[65] flex justify-center overflow-y-auto overscroll-contain bg-night"
    >
      <div className="flex min-h-full w-full flex-col bg-surface text-ink">
        <header className="relative h-48 shrink-0 overflow-hidden bg-accent-2">
          {photoUrl !== null ? (
            <img
              src={photoUrl}
              alt={t('result.photoAlt')}
              className="h-full w-full object-cover outline outline-1 -outline-offset-1 outline-black/10"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-white/80">
              <Sprout size={64} strokeWidth={1.3} aria-hidden="true" />
            </div>
          )}
          <button
            type="button"
            onClick={onBack}
            autoFocus
            aria-label={t('result.back')}
            className="absolute left-4 top-[max(24px,calc(env(safe-area-inset-top)+var(--app-top-inset)))] flex h-11 w-11 items-center justify-center rounded-full bg-surface text-ink shadow-raised transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-accent-2"
          >
            <ArrowLeft size={20} strokeWidth={2.2} aria-hidden="true" />
          </button>

          <span className="absolute bottom-3 left-4 rounded-full bg-accent px-3 py-1 text-caption font-medium text-on-accent">
            {t('result.yourPhoto')}
          </span>
        </header>

        <div className="flex-1 px-4 pb-6 pt-4">
          <h1 className="sr-only">{t('result.title')}</h1>

          {principal === null ? (
            <p
              role="status"
              className="rounded-card bg-surface-2 p-4 text-body text-muted shadow-raised"
            >
              {t('result.noCandidates')}
            </p>
          ) : (
            <section aria-labelledby="especie-mas-probable">
              <h2
                id="especie-mas-probable"
                className="text-caption uppercase tracking-wider text-muted"
              >
                {t('result.best')}
              </h2>

              <article className="mt-2.5 rounded-card bg-surface p-3.5 shadow-raised ring-2 ring-accent">
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent"
                  >
                    <Sprout size={26} strokeWidth={1.7} />
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="font-display break-words text-heading text-ink">
                      {principal.scientificName}
                    </p>
                    {detalles !== null && (
                      <p className="mt-0.5 break-words text-small text-muted">
                        {detalles}
                      </p>
                    )}
                  </div>

                  <p className="shrink-0 text-title tabular-nums text-accent">
                    {pct}%
                  </p>
                </div>

                <div
                  role="progressbar"
                  aria-label={t('result.confidenceAria', { name: principal.scientificName })}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={pct ?? 0}
                  className="mt-3 h-1.5 overflow-hidden rounded-full bg-accent-soft"
                >
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${pct ?? 0}%` }}
                  />
                </div>
                {nivel !== null && (
                  <p className={`mt-1.5 text-small font-medium ${nivel === 'result.low' ? 'text-warm-strong' : 'text-muted'}`}>{t(nivel)}</p>
                )}

                {onOpenPrimary !== undefined && (
                  <button
                    type="button"
                    onClick={() => onOpenPrimary(principal)}
                    className="mt-3 flex min-h-12 w-full items-center justify-center rounded-card bg-accent px-4 text-body font-semibold text-on-accent shadow-raised transition-colors hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                  >
                    {t('result.viewCard')}
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
              onOpenMatch={onOpenPrimary}
              max={maxAlternatives}
            />
          )}

          {selectedName !== null && selectedName !== undefined && (
            <p role="status" className="mt-3 text-body font-medium text-accent">
              {t('result.selected')}: {selectedName}
            </p>
          )}

          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={onRepeatPhoto}
              className="inline-flex min-h-12 items-center justify-center rounded-card px-4 text-body font-semibold text-accent transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {t('result.none')}
            </button>
          </div>
        </div>

        <footer className="mt-auto flex items-start gap-2.5 border-t border-line bg-surface-2 px-4 pt-4 pb-4 text-caption text-muted">
          <span
            aria-hidden="true"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-surface text-accent"
          >
            <Sprout size={14} strokeWidth={2} />
          </span>
          <p>{t('result.footer')}</p>
        </footer>
      </div>
    </div>
  );
}

export default ResultadoEscaneo;
