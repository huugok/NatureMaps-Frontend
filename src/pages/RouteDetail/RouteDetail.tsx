import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Footprints, MapPin, Route as RouteIcon } from 'lucide-react';
import { OfflineRouteCard, SavedStopCards } from '../../components/OfflineRoute';
import { Page } from '../../components/Page';
import { Badge } from '../../components/ui/Badge';
import { useApp } from '../../context/useApp';
import { formatDistance, formatDuration } from '../../i18n/format';
import { fetchRouteDetail } from '../../services/routes';
import type { RouteDetail as RouteDetailData, RouteStop } from '../../services/routes';
import { RouteMap } from './RouteMap';

/** Ficha de una ruta del catálogo (/rutas/:id): mapa del recorrido, datos
 * principales (tema, forma, longitud, duración, paradas), descripción y lista
 * de paradas en orden. Los datos vienen de BD: el mapa se pinta al instante.
 * Al pulsar una parada de planta se abre su ficha (como en el mapa). */

type DetailState =
  | { status: 'loading' }
  | { status: 'ready'; route: RouteDetailData }
  | { status: 'notFound' }
  | { status: 'error' };

export interface RouteDetailProps {
  /** Responde al toque de una parada de la ruta (abre su ficha). */
  onOpenStop?: (stop: RouteStop) => void;
}

export function RouteDetail({ onOpenStop }: RouteDetailProps = {}) {
  const { t, lang } = useApp();
  const navigate = useNavigate();
  const { id } = useParams();
  const [state, setState] = useState<DetailState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  const routeId = id !== undefined && /^\d+$/.test(id) ? Number(id) : null;

  useEffect(() => {
    if (routeId === null) return;
    let cancelled = false;
    fetchRouteDetail(routeId)
      .then((route) => {
        if (!cancelled) setState({ status: 'ready', route });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({ status: error && typeof error === 'object' && (error as { status?: number }).status === 404 ? 'notFound' : 'error' });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [routeId, attempt]);

  if (routeId === null) {
    return (
      <Page title={t('routes.title')} back>
        <p role="alert" className="text-small text-muted">
          {t('routes.notFound')}
        </p>
      </Page>
    );
  }

  if (state.status === 'loading') {
    return (
      <Page title={t('routes.title')} back>
        <p role="status" className="text-small text-muted">
          {t('routes.loading')}
        </p>
      </Page>
    );
  }

  if (state.status === 'notFound' || state.status === 'error') {
    return (
      <Page title={t('routes.title')} back>
        <div className="flex flex-col items-start gap-3">
          <p role="alert" className="text-small text-muted">
            {state.status === 'notFound' ? t('routes.notFound') : t('routes.error')}
          </p>
          <button
            type="button"
            className="rounded-full bg-accent px-4 py-2 text-small font-bold text-on-accent"
            onClick={() => {
              setState({ status: 'loading' });
              setAttempt((attempts) => attempts + 1);
            }}
          >
            {t('routes.retry')}
          </button>
        </div>
      </Page>
    );
  }

  const route = state.route;
  const theme = route.theme === 'botanica'
    ? t('routes.theme.botanica')
    : route.theme === 'cultural'
      ? t('routes.theme.cultural')
      : route.theme === 'sponsor'
        ? t('routes.theme.sponsor')
        : t('routes.theme.mixta');
  const shape = route.shape === 'circular' ? t('routes.shape.circular') : t('routes.shape.lineal');

  return (
    <Page
      title={route.name}
      subtitle={theme}
      back
      flush
    >
      <div className="h-64 shrink-0 border-y border-line">
        <RouteMap route={route} onOpenStop={onOpenStop} />
      </div>
      <div className="flex flex-1 flex-col gap-4 px-4 py-4">
        <div className="flex flex-wrap gap-2">
          <Badge>{theme}</Badge>
          <Badge>{shape}</Badge>
        </div>
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-muted">
          <li className="flex items-center gap-1.5">
            <RouteIcon aria-hidden className="size-3.5" />
            {formatDistance(route.distanceMeters, lang)}
          </li>
          <li className="flex items-center gap-1.5">
            <Footprints aria-hidden className="size-3.5" />
            {formatDuration(route.durationSeconds, lang)}
          </li>
          <li className="flex items-center gap-1.5">
            <MapPin aria-hidden className="size-3.5" />
            {t('routes.stopsCount', { n: route.stopsCount })}
          </li>
        </ul>
        <p className="text-small text-pretty break-words">{route.description}</p>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => navigate(`/mapa?verRuta=${route.id}`)}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-4 text-small font-bold text-on-accent transition-[transform,background-color] active:scale-95"
          >
            <Footprints size={16} aria-hidden="true" />
            {t('routes.start')}
          </button>
        </div>
        <OfflineRouteCard key={route.id} routeId={route.id} />

        <section aria-label={t('routes.stopsList')}>
          <h2 className="font-display text-body font-bold">{t('routes.stopsList')}</h2>
          <ol className="mt-2 flex flex-col gap-1">
            {route.stops.map((stop, index) => {
              const label = (
                <>
                  <span
                    className="grid size-6 shrink-0 place-items-center rounded-full text-caption font-bold text-on-accent"
                    style={{ backgroundColor: stop.kind === 'planta' ? 'var(--color-accent)' : stop.kind === 'sponsor' ? 'var(--color-sponsor)' : 'var(--color-place)' }}
                    aria-hidden
                  >
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1 text-balance break-words">
                    {stop.name}
                    <span className="ml-2 text-caption text-muted">
                      {stop.kind === 'planta' ? t('routes.stopPlant') : stop.kind === 'sponsor' ? t('routes.stopSponsor') : t('routes.stopPoi')}
                    </span>
                  </span>
                </>
              );
              // Solo las plantas tienen ficha: las de POI quedan como texto.
              if (stop.kind === 'planta' && onOpenStop) {
                return (
                  <li key={`${stop.kind}-${stop.id}`}>
                    <button
                      type="button"
                      onClick={() => onOpenStop(stop)}
                      className="flex w-full items-center gap-3 rounded-control px-2 py-2 text-left text-small transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      {label}
                    </button>
                  </li>
                );
              }
              return (
                <li key={`${stop.kind}-${stop.id}`} className="flex items-center gap-3 px-2 py-2 text-small">
                  {label}
                </li>
              );
            })}
          </ol>
        </section>
        <SavedStopCards key={`saved-${route.id}`} routeId={route.id} />
      </div>
    </Page>
  );
}
