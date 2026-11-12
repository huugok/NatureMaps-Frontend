import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Footprints, MapPin, Route as RouteIcon } from 'lucide-react';
import { Page } from '../../components/Page';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { useApp } from '../../context/useApp';
import { formatDistance, formatDuration } from '../../i18n/format';
import { fetchRouteList } from '../../services/routes';
import type { RouteSummary, RouteTheme } from '../../services/routes';

/** Rutas: catálogo predefinido del backend (GET /routes). Cada tarjeta lleva
 * nombre, tema, longitud, duración y número de paradas; la ficha abre en
 * /rutas/:id. Sin filtros: son 9 rutas y caben en una pantalla. */

type ListState = { status: 'loading' } | { status: 'ready'; routes: RouteSummary[] } | { status: 'error' };

// Posición del scroll del listado: al abrir una ruta la pantalla se sustituye,
// así que se guarda y se restaura al volver (la lista se lee como un scroll
// continuo, no como una pantalla nueva).
let savedScrollTop = 0;

function ThemeBadge({ theme }: { theme: RouteTheme }) {
  const { t } = useApp();
  const label = theme === 'botanica'
    ? t('routes.theme.botanica')
    : theme === 'cultural'
      ? t('routes.theme.cultural')
      : t('routes.theme.mixta');
  return <Badge>{label}</Badge>;
}

function RouteCard({ route, onOpen }: { route: RouteSummary, onOpen: (route: RouteSummary) => void }) {
  const { t, lang } = useApp();
  return (
    <button
      type="button"
      className="w-full rounded-card bg-surface p-4 text-left shadow-raised transition-transform active:scale-[0.99]"
      onClick={() => onOpen(route)}
      aria-label={route.name}
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-display text-body font-bold text-balance break-words">{route.name}</h2>
        <ThemeBadge theme={route.theme} />
      </div>
      <p className="mt-1.5 text-small text-muted text-pretty break-words">{route.description}</p>
      <ul className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-muted">
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
    </button>
  );
}

export function RoutesList() {
  const { t } = useApp();
  const navigate = useNavigate();
  const [state, setState] = useState<ListState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const listRef = useRef<HTMLUListElement | null>(null);

  /** Abre la ficha de una ruta guardando dónde estaba la lista. */
  const openRoute = (route: RouteSummary) => {
    // El contenedor con scroll es el <main> de TabLayout.
    const scroller = listRef.current?.closest('main');
    savedScrollTop = scroller?.scrollTop ?? 0;
    navigate(`/rutas/${route.id}`);
  };

  // El catálogo es independiente del idioma (nombres curados en la seed);
  // solo se recarga al reintentar tras un error.
  useEffect(() => {
    let cancelled = false;
    fetchRouteList()
      .then((routes) => {
        if (!cancelled) setState({ status: 'ready', routes });
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  // Al volver de una ficha se restaura la posición en la que estaba la lista.
  useEffect(() => {
    if (state.status !== 'ready' || savedScrollTop <= 0) return;
    const scroller = listRef.current?.closest('main');
    if (!scroller) return;
    scroller.scrollTop = savedScrollTop;
  }, [state]);

  return (
    <Page title={t('routes.title')} subtitle={t('routes.subtitle')}>
      {state.status === 'loading' && (
        <p role="status" className="text-small text-muted">
          {t('routes.loading')}
        </p>
      )}
      {state.status === 'error' && (
        <div className="flex flex-col items-start gap-3">
          <p role="alert" className="text-small text-muted">
            {t('routes.error')}
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
      )}
      {state.status === 'ready' && state.routes.length === 0 && (
        <EmptyState icon={RouteIcon} title={t('routes.empty')} description={t('routes.emptyDesc')} />
      )}
      {state.status === 'ready' && state.routes.length > 0 && (
        <ul ref={listRef} className="flex flex-col gap-3" aria-label={t('routes.title')}>
          {state.routes.map((route) => (
            <li key={route.id}>
              <RouteCard route={route} onOpen={openRoute} />
            </li>
          ))}
        </ul>
      )}
    </Page>
  );
}
