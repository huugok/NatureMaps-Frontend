import { useState } from 'react';
import {
  ArrowLeft,
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
import { IDENTIFICATION_NOTICE, SAMPLE_SPECIES } from './constants';
import type { FichaEspecie, FichaFuente, IdentificacionFicha } from './types';

export interface FichaPlantaPageProps {
  /**
   * Especie que pinta la ficha. Si no se pasa, se usa la de ejemplo
   * (`SAMPLE_SPECIES`), que es lo que hacía antes de recibirla por props.
   */
  species?: FichaEspecie;
  /**
   * Presente cuando la ficha se abre desde una identificación: añade el chip
   * con la confianza para poder comprobar que es la especie identificada.
   */
  identification?: IdentificacionFicha | null;
  /** Callback al pulsar el botón de volver. */
  onBack?: () => void;
  /** Callback al pulsar "Ver en el mapa". */
  onViewOnMap?: () => void;
  /** Callback al marcar o desmarcar la especie como favorita. */
  onToggleFavorite?: () => void;
}

interface SourceCardProps {
  source: FichaFuente;
}

function SourceCard({ source }: SourceCardProps) {
  const Icon = source.icon === 'landmark' ? Landmark : Search;

  return (
    <li className="rounded-2xl border border-neutral-200 bg-white p-4">
      <div className="flex gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-600">
          <Icon size={18} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-neutral-900">{source.name}</p>
          {source.description && (
            <p className="mt-0.5 text-xs leading-relaxed break-words text-neutral-500">{source.description}</p>
          )}
          {source.url && (
            <a
              href={source.url}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-xs font-medium break-all text-emerald-700 underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
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
 * descripción breve, dato de interés, fuentes y acceso al mapa.
 *
 * Recibe la especie por props para poder abrir la ficha de cualquier especie
 * identificada (PA 1250 y PA 692). Las especies de la demo traen el contenido
 * completo; las que llegan de Pl@ntNet solo nombre, familia, foto y fuente, así
 * que cada sección se pinta únicamente si tiene datos.
 */
export function FichaPlantaPage({
  species,
  identification = null,
  onBack,
  onViewOnMap,
  onToggleFavorite,
}: FichaPlantaPageProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  const planta = species ?? SAMPLE_SPECIES;

  const primaryLocation = planta.locations?.[0];
  const sources = planta.sources ?? [];

  const handleToggleFavorite = () => {
    setIsFavorite((current) => !current);
    onToggleFavorite?.();
  };

  const handleViewOnMap = () => {
    onViewOnMap?.();
  };

  return (
    <article className="mx-auto w-full max-w-md bg-white pb-[calc(62px+env(safe-area-inset-bottom,0px))] shadow-sm">
      <div className="relative h-64 w-full overflow-hidden bg-emerald-100 sm:h-72">
        {planta.photoUrl ? (
          <img
            src={planta.photoUrl}
            alt={planta.photoAlt ?? `Fotografía de ${planta.commonName}`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-emerald-600">
            <Trees size={56} aria-hidden="true" />
          </div>
        )}

        <header className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
          <button
            type="button"
            onClick={onBack}
            aria-label="Volver"
            className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-neutral-700 shadow-sm transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
          >
            <ArrowLeft size={22} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={handleToggleFavorite}
            aria-pressed={isFavorite}
            aria-label={isFavorite ? 'Quitar de favoritos' : 'Guardar en favoritos'}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-neutral-700 shadow-sm transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
          >
            <Heart
              size={22}
              fill={isFavorite ? 'currentColor' : 'none'}
              className={isFavorite ? 'text-rose-600' : 'text-neutral-700'}
              aria-hidden="true"
            />
          </button>
        </header>
      </div>

      <section className="relative z-10 -mt-6 rounded-t-3xl bg-white px-5 pt-5">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
          {planta.scientificName}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          <span>{planta.commonName}</span>
          {planta.family && (
            <>
              {' · '}
              <span>Familia {planta.family}</span>
            </>
          )}
        </p>

        {(identification !== null || Boolean(planta.flowering) || primaryLocation !== undefined) && (
          <ul className="mt-4 flex flex-wrap gap-2">
            {identification && (
              <li className="inline-flex items-center gap-1.5 rounded-full bg-emerald-700 px-3 py-1 text-xs font-medium text-white">
                <ScanSearch size={14} aria-hidden="true" />
                Identificada con {Math.round(identification.score * 100)}% de confianza
              </li>
            )}
            {planta.flowering && (
              <li className="inline-flex items-center gap-1.5 rounded-full bg-pink-100 px-3 py-1 text-xs font-medium text-pink-800">
                <Flower2 size={14} aria-hidden="true" />
                Floración: {planta.flowering}
              </li>
            )}
            {primaryLocation && (
              <li className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-900">
                <MapPin size={14} aria-hidden="true" />
                {primaryLocation.name}
              </li>
            )}
          </ul>
        )}

        {planta.description && (
          <>
            <h2 className="mt-6 text-lg font-bold text-neutral-900">Descripción</h2>
            <p className="mt-2 text-sm leading-relaxed text-neutral-600">{planta.description}</p>
          </>
        )}

        {planta.curiosity && (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="flex gap-3 text-sm leading-relaxed text-neutral-700">
              <Lightbulb size={20} className="mt-0.5 shrink-0 text-amber-600" aria-hidden="true" />
              <span>
                <strong className="font-semibold text-neutral-900">{planta.curiosity.label}:</strong>{' '}
                {planta.curiosity.text}
              </span>
            </p>
          </div>
        )}

        <div className="mt-4 flex gap-3 rounded-2xl bg-neutral-100 p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-[8px] font-bold text-neutral-500">
            LOGO
          </span>
          <p className="text-xs leading-relaxed text-neutral-500">
            {IDENTIFICATION_NOTICE.text}{' '}
            <a
              href={IDENTIFICATION_NOTICE.url}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-emerald-700 underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
            >
              {IDENTIFICATION_NOTICE.url}
            </a>
          </p>
        </div>

        {sources.length > 0 && (
          <>
            <div className="mt-6 flex items-center gap-2">
              <h2 className="text-lg font-bold text-neutral-900">Fuentes de información</h2>
              <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-emerald-700 px-1.5 text-xs font-semibold text-white">
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
      </section>

      {/* El botón va al final de la ficha, no fijo: así nunca tapa el contenido
          (la última fuente, la descripción…). El relleno inferior de la tarjeta
          lo deja por encima de la barra de navegación al final del scroll. */}
      <div className="border-t border-neutral-200 bg-white px-4 py-3">
        <button
          type="button"
          onClick={handleViewOnMap}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-800 px-4 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
        >
          <MapPin size={18} aria-hidden="true" />
          Ver en el mapa
        </button>
      </div>
    </article>
  );
}

export default FichaPlantaPage;
