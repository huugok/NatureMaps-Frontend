import { useState } from 'react';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Flower2,
  Heart,
  Landmark,
  Lightbulb,
  MapPin,
  ScanSearch,
  Search,
  Trees,
} from 'lucide-react';
import { useApp } from '../../context/useApp';
import { IDENTIFICATION_NOTICE } from './constants';
import type { FichaEspecie, FichaFuente, IdentificacionFicha } from './types';

export interface FichaPlantaPageProps {
  /**
   * Especie que pinta la ficha: del catálogo del backend (la carga App, UT
   * F06) o construida desde una identificación de Pl@ntNet. Siempre
   * obligatoria: la página es presentacional y no tiene datos de ejemplo.
   */
  species: FichaEspecie;
  /**
   * Presente cuando la ficha se abre desde una identificación: añade el chip
   * con la confianza para poder comprobar que es la especie identificada.
   */
  identification?: IdentificacionFicha | null;
  /** Posición (0-based) de la especie en el catálogo. */
  position?: number;
  /**
   * Número total de especies del catálogo. Si no se pasa (ficha abierta desde
   * el escaneo, sin navegación), la fila Anterior/Siguiente no se pinta.
   */
  total?: number;
  /** Callback al pulsar el botón de volver. */
  onBack?: () => void;
  /** Callback al pulsar "Ver en el mapa". */
  onViewOnMap?: () => void;
  /** Callback al marcar o desmarcar la especie como favorita. */
  onToggleFavorite?: () => void;
  /** Callback al pulsar "Anterior": ausente cuando no hay especie previa. */
  onPrevious?: () => void;
  /** Callback al pulsar "Siguiente": ausente cuando no hay especie siguiente. */
  onNext?: () => void;
}

interface SourceCardProps {
  source: FichaFuente;
}

function SourceCard({ source }: SourceCardProps) {
  const Icon = source.icon === 'landmark' ? Landmark : Search;

  return (
    <li className="rounded-card bg-surface p-4 shadow-raised">
      <div className="flex gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-muted">
          <Icon size={18} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-body font-semibold text-ink">{source.name}</p>
          {source.description && (
            <p className="mt-0.5 text-small break-words text-muted">{source.description}</p>
          )}
          {source.url && (
            <a
              href={source.url}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-small font-medium break-all text-accent underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {source.url}
              <ExternalLink size={12} aria-hidden="true" />
            </a>
          )}
        </div>
      </div>
    </li>
  );
}

/**
 * Ficha de planta (RF3): foto, nombre común y científico, familia,
 * descripción, dato de interés, fuentes y acceso al mapa.
 *
 * Presentacional: recibe la especie por props —del catálogo del backend o
 * construida desde una identificación (PA 1250 y PA 692)— y pinta cada sección
 * únicamente si tiene datos. La fila Anterior/Siguiente solo se pinta cuando
 * App pasa el total del catálogo.
 */
export function FichaPlantaPage({
  species,
  identification = null,
  position,
  total,
  onBack,
  onViewOnMap,
  onToggleFavorite,
  onPrevious,
  onNext,
}: FichaPlantaPageProps) {
  const { t } = useApp();
  const [isFavorite, setIsFavorite] = useState(false);

  const primaryLocation = species.locations?.[0];
  const sources = species.sources ?? [];

  const handleToggleFavorite = () => {
    setIsFavorite((current) => !current);
    onToggleFavorite?.();
  };

  const handleViewOnMap = () => {
    onViewOnMap?.();
  };

  return (
    <article className="flex min-h-full w-full touch-pan-y flex-col bg-surface">
      <div className="relative h-64 w-full overflow-hidden bg-accent-soft sm:h-72">
        {species.photoUrl ? (
          <img
            src={species.photoUrl}
            alt={species.photoAlt ?? t('ficha.photoAlt', { name: species.commonName })}
            className="h-full w-full object-cover outline outline-1 -outline-offset-1 outline-black/10"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-accent">
            <Trees size={56} aria-hidden="true" />
          </div>
        )}
        {species.photoCredit && (
          <p className="absolute inset-x-0 bottom-0 bg-black/55 px-3 py-1 text-caption text-white/90">
            {t('ficha.photoCredit', { credit: species.photoCredit })}
          </p>
        )}

        <header className="absolute inset-x-0 top-0 flex items-center justify-between px-4 pb-4 pt-[max(24px,calc(env(safe-area-inset-top)+var(--app-top-inset)))]">
          <button
            type="button"
            onClick={onBack}
            aria-label={t('common.back')}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-surface/90 text-ink shadow-raised transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <ArrowLeft size={22} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={handleToggleFavorite}
            aria-pressed={isFavorite}
            aria-label={isFavorite ? t('ficha.favoriteRemove') : t('ficha.favoriteAdd')}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-surface/90 text-ink shadow-raised transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <Heart
              size={22}
              fill={isFavorite ? 'currentColor' : 'none'}
              className={isFavorite ? 'text-danger' : 'text-ink'}
              aria-hidden="true"
            />
          </button>
        </header>
      </div>

      <section className="relative z-10 -mt-6 flex-1 rounded-t-3xl bg-surface px-4 pt-5">
        <h1 className="font-display break-words text-title text-balance text-ink">
          {species.scientificName}
        </h1>
        <p className="mt-1 break-words text-small text-muted">
          <span>{species.commonName}</span>
          {species.family && (
            <>
              {' · '}
              <span>{t('ficha.family')} {species.family}</span>
            </>
          )}
        </p>

        {(identification !== null || Boolean(species.flowering) || primaryLocation !== undefined || (species.locationTotal ?? 0) > 0) && (
          <ul className="mt-4 flex flex-wrap gap-2">
            {identification && (
              <li>
                <button
                  type="button"
                  onClick={onBack}
                  disabled={onBack === undefined}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-caption font-medium text-on-accent transition-colors enabled:hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-default"
                >
                  <ScanSearch size={14} aria-hidden="true" />
                  {t('ficha.confidence', { score: Math.round(identification.score * 100) })}
                </button>
              </li>
            )}
            {species.flowering && (
              <li className="inline-flex items-center gap-1.5 rounded-full bg-warm/15 px-3 py-1 text-caption font-medium text-warm-strong">
                <Flower2 size={14} aria-hidden="true" />
                {t('ficha.flowering')}: {species.flowering}
              </li>
            )}
            {primaryLocation && (
              <li className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-caption font-medium text-accent">
                <MapPin size={14} aria-hidden="true" />
                {primaryLocation.name}
              </li>
            )}
            {(species.locationTotal ?? 0) > 0 && (
              <li className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1 text-caption font-medium text-ink-2">
                <Trees size={14} aria-hidden="true" />
                {t((species.locationTotal ?? 0) === 1 ? 'ficha.specimen' : 'ficha.specimens', { count: species.locationTotal ?? 0 })}
              </li>
            )}
          </ul>
        )}

        {species.description && (
          <>
            <h2 className="font-display mt-6 text-heading text-ink">{t('ficha.description')}</h2>
            <p className="font-body mt-2 break-words whitespace-pre-line text-body text-muted text-pretty">{species.description}</p>
          </>
        )}

        {species.curiosity && (
          <div className="mt-4 rounded-card border border-warm/30 bg-warm/10 p-4">
            <p className="flex gap-3 text-body text-ink-2">
              <Lightbulb size={20} className="mt-0.5 shrink-0 text-warm-strong" aria-hidden="true" />
              <span className="font-body whitespace-pre-line">
                <strong className="font-semibold text-ink">{t('ficha.curiosity')}:</strong>{' '}
                {species.curiosity.text}
              </span>
            </p>
          </div>
        )}

        <div className="mt-4 flex gap-3 rounded-card bg-surface-2 p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface text-accent shadow-raised">
            <ScanSearch size={18} aria-hidden="true" />
          </span>
          <p className="text-small text-muted">
            {t('ficha.notice')}{' '}
            <a
              href={IDENTIFICATION_NOTICE.url}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-accent underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {IDENTIFICATION_NOTICE.url}
            </a>
          </p>
        </div>

        {sources.length > 0 && (
          <>
            <div className="mt-6 flex items-center gap-2">
              <h2 className="font-display text-heading text-ink">{t('ficha.sources')}</h2>
              <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-accent px-1.5 text-caption tabular-nums text-on-accent">
                {sources.length}
              </span>
            </div>
            <ul className="mt-3 space-y-2">
              {sources.map((source) => (
                <SourceCard key={source.name} source={source} />
              ))}
            </ul>
          </>
        )}

        {/* Navegación entre las especies del catálogo (Anterior/Siguiente):
            solo tiene sentido cuando la ficha viene del catálogo, no del escaneo. */}
        {total !== undefined && (
          <div className="mt-6 flex items-center justify-between gap-2" aria-label={t('ficha.nav')}>
            <button
              type="button"
              onClick={onPrevious}
              disabled={!onPrevious}
              aria-label={t('ficha.previousAria')}
              className="inline-flex min-h-11 items-center gap-1 rounded-card bg-surface px-4 text-body font-semibold text-ink shadow-raised transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={16} aria-hidden="true" />
              {t('ficha.previous')}
            </button>
            <span className="text-caption tabular-nums text-muted">{(position ?? 0) + 1} / {total}</span>
            <button
              type="button"
              onClick={onNext}
              disabled={!onNext}
              aria-label={t('ficha.nextAria')}
              className="inline-flex min-h-11 items-center gap-1 rounded-card bg-surface px-4 text-body font-semibold text-ink shadow-raised transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t('ficha.next')}
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>
        )}
      </section>

      {/* El botón va al final de la ficha, no fijo: así nunca tapa el contenido
          (la última fuente, la descripción…). El relleno inferior de la tarjeta
          lo deja por encima de la barra de navegación al final del scroll. */}
      <div className="mt-auto border-t border-line bg-surface px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom,0px))]">
        <button
          type="button"
          onClick={handleViewOnMap}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-card bg-accent px-4 py-3 text-body font-semibold text-on-accent shadow-raised transition-colors hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        >
          <MapPin size={18} aria-hidden="true" />
          {t('ficha.viewOnMap')}
        </button>
      </div>
    </article>
  );
}

export default FichaPlantaPage;
