import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Footprints, MapPin, Route as RouteIcon } from 'lucide-react';
import { Page } from '../../components/Page';
import { Badge } from '../../components/ui/Badge';
import { useApp } from '../../context/useApp';
import { formatDistance } from '../../i18n/format';
import { fetchRouteDetail } from '../../services/routes';
import type { RouteDetail as RouteDetailData, RouteShape, RouteTheme } from '../../services/routes';
import { RouteMap } from './RouteMap';

/** Ficha de una ruta del catálogo (/rutas/:id): mapa del recorrido, datos
 * principales (tema, forma, longitud, duración, paradas), descripción y lista
 * de paradas en orden. Los datos vienen de BD: el mapa se pinta al instante. */

type DetailState =
  | { status: 'loading' }
  | { status: 'ready'; route: RouteDetailData }
  | { status: 'notFound' }
  | { status: 'error' };

function themeLabel(theme: RouteTheme, t: (key: 'routes.theme.botanica' | 'routes.theme.cultural' | 'routes.theme.mixta') => string) {
  if (theme === 'botanica') return t('routes.theme.botanica');
  if (theme === 'cultural') return t('routes.theme.cultural');
  return t('routes.theme.mixta');
}

function shapeLabel(shape: RouteShape, t: (key: 'routes.shape.circular' | 'routes.shape.lineal') => string) {
  return shape === 'circular' ? t('routes.shape.circular') : t('routes.shape.lineal');
}

export function RouteDetail() {
  const { t, lang } = useApp();
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
        if (!cancelled) setState({ status: error && typeof error === 'object' && (error as { status?: number }).status === 404 ? 'notFound' : 'error' });
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
  const minutes = Math.round(route.durationSeconds / 60);

  return (
    <Page title={route.name} subtitle={themeLabel(route.theme, t)} back flush>
      <div className="h-64 shrink-0 border-y border-line">
        <RouteMap route={route} />
      </div>
      <div className="flex flex-1 flex-col gap-4 px-4 py-4">
        <div className="flex flex-wrap gap-2">
          <Badge>{themeLabel(route.theme, t)}</Badge>
          <Badge>{shapeLabel(route.shape, t)}</Badge>
        </div>
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-muted">
          <li className="flex items-center gap-1.5">
            <RouteIcon aria-hidden className="size-3.5" />
            {formatDistance(route.distanceMeters, lang)}
          </li>
          <li className="flex items-center gap-1.5">
            <Footprints aria-hidden className="size-3.5" />
            {t('routes.duration', { n: minutes })}
          </li>
          <li className="flex items-center gap-1.5">
            <MapPin aria-hidden className="size-3.5" />
            {t('routes.stopsCount', { n: route.stopsCount })}
          </li>
        </ul>
        <p className="text-small text-pretty">{route.description}</p>
        <section aria-label={t('routes.stopsList')}>
          <h2 className="font-display text-body font-bold">{t('routes.stopsList')}</h2>
          <ol className="mt-2 flex flex-col gap-2">
            {route.stops.map((stop, index) => (
              <li key={`${stop.kind}-${stop.id}`} className="flex items-center gap-3 text-small">
                <span
                  className="grid size-6 shrink-0 place-items-center rounded-full text-caption font-bold text-on-accent"
                  style={{ backgroundColor: stop.kind === 'planta' ? '#3a7d44' : '#c77d1f' }}
                  aria-hidden
                >
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 text-balance">
                  {stop.name}
                  <span className="ml-2 text-caption text-muted">
                    {stop.kind === 'planta' ? t('routes.stopPlant') : t('routes.stopPoi')}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </Page>
  );
}
