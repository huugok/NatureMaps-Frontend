import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Footprints, MapPin, Route as RouteIcon } from 'lucide-react';
import { OfflineRouteCard, SavedStopCards } from '../../components/OfflineRoute';
import { Page } from '../../components/Page';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { useApp } from '../../context/useApp';
import { formatDistance, formatDuration } from '../../i18n/format';
import { fetchRouteDetail } from '../../services/routes';
import type { RouteDetail as RouteDetailData, RouteStop } from '../../services/routes';
import { routeStore } from '../../services/offlineRouteStorage';
import { RouteMap } from './RouteMap';

/** Ficha de una ruta del catálogo (/rutas/:id): mapa del recorrido, datos
 * principales (tema, forma, longitud, duración, paradas), descripción y lista
 * de paradas en orden. Los datos vienen de BD: el mapa se pinta al instante.
 * Al pulsar una parada de planta se abre su ficha (como en el mapa). */

type DetailState =
  | { status: 'loading' }
  | { status: 'ready'; route: RouteDetailData }
  | { status: 'notFound' }
  | { status: 'offlineMissing' }
  | { status: 'error' };

const stopItemClassName = 'flex min-h-11 w-full items-center gap-3 rounded-control px-2 py-2 text-left text-small';

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
  const [activeSavedStop, setActiveSavedStop] = useState<{ routeId: number; index: number }>();
  const [savedRouteState, setSavedRouteState] = useState<{ routeId: number; exists: boolean }>();

  const routeId = id !== undefined && /^\d+$/.test(id) ? Number(id) : null;
  const hasSavedRoute = savedRouteState?.routeId === routeId && savedRouteState.exists === true;

  useEffect(() => {
    if (routeId === null) return;
    let active = true;
    const refresh = () => {
      void routeStore().get(routeId).then((record) => {
        if (active) setSavedRouteState({ routeId, exists: record !== undefined });
      }).catch(() => {
        if (active) setSavedRouteState({ routeId, exists: false });
      });
    };
    refresh();
    window.addEventListener('naturemaps-route-downloads', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      active = false;
      window.removeEventListener('naturemaps-route-downloads', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [routeId]);

  useEffect(() => {
    if (routeId === null) return;
    let cancelled = false;
    fetchRouteDetail(routeId)
      .then((route) => {
        if (!cancelled) setState({ status: 'ready', route });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          const status = error && typeof error === 'object' ? (error as { status?: number }).status : undefined;
          if (status === 404) {
            setState({ status: 'notFound' });
          } else if (navigator.onLine === false || error instanceof TypeError) {
            setState({ status: 'offlineMissing' });
          } else {
            setState({ status: 'error' });
          }
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

  if (state.status === 'notFound' || state.status === 'error' || state.status === 'offlineMissing') {
    const message = state.status === 'notFound'
      ? t('routes.notFound')
      : state.status === 'offlineMissing'
        ? t('routeOffline.unavailable')
        : t('routes.error');
    return (
      <Page title={t('routes.title')} back>
        <div className="flex flex-col items-start gap-3">
          <p role="alert" className="text-small text-muted">
            {message}
          </p>
          {state.status === 'offlineMissing' ? (
            <Button variant="secondary" onClick={() => navigate('/rutas')}>
              {t('routeOffline.backToRoutes')}
            </Button>
          ) : (
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
          )}
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

  /** Las plantas enlazadas abren su ficha completa. Los POIs y las plantas
   * sin especie enlazada consultan la ficha guardada de la parada. */
  const openStop = (stop: RouteStop, index: number) => {
    if (stop.kind === 'planta' && stop.speciesId !== null && onOpenStop) {
      onOpenStop(stop);
      return;
    }
    if (routeId !== null && hasSavedRoute) setActiveSavedStop({ routeId, index });
  };

  const activeSavedStopIndex = activeSavedStop?.routeId === routeId ? activeSavedStop.index : undefined;

  return (
    <Page
      title={route.name}
      subtitle={theme}
      back
      flush
    >
      <div className="h-64 shrink-0 border-y border-line">
        <RouteMap
          route={route}
          openPoiStops={hasSavedRoute}
          onOpenStop={(stop) => {
            const index = route.stops.findIndex((item) => item.kind === stop.kind && item.id === stop.id);
            if (index >= 0) openStop(stop, index);
          }}
        />
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
              const canOpen = (stop.kind === 'planta' && stop.speciesId !== null && Boolean(onOpenStop)) || hasSavedRoute;
              return (
                <li key={`${stop.kind}-${stop.id}`}>
                  {canOpen ? (
                    <button
                      type="button"
                      onClick={() => openStop(stop, index)}
                      className={`${stopItemClassName} transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent`}
                    >
                      {label}
                    </button>
                  ) : (
                    <div className={stopItemClassName}>{label}</div>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
        <SavedStopCards
          key={`saved-${route.id}`}
          routeId={route.id}
          activeIndex={activeSavedStopIndex}
          onClose={() => setActiveSavedStop(undefined)}
        />
      </div>
    </Page>
  );
}
