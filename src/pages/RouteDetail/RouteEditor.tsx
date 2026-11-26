import { useEffect, useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { fetchNearbyTrees } from '../../services/nearby';
import { fetchSponsors } from '../../services/sponsors';
import { removeRoute, saveRoute } from '../../services/routes';
import type { RouteDetail, RouteEdit, RouteStop, RouteTheme } from '../../services/routes';
import { metersBetween } from '../../services/plantGroups';
import { formatDistance } from '../../i18n/format';
import { RouteMap } from './RouteMap';

interface RouteEditorProps {
  route: RouteDetail;
  onSaved: (route: RouteDetail) => void;
  onDeleted: () => void;
  onCancel: () => void;
}

const THEMES: RouteTheme[] = ['botanica', 'cultural', 'mixta', 'sponsor'];
const MAX_CANDIDATES = 20;

/** Editor de una ruta propia. Solo nombre, tema y paradas: la forma no se toca.
 *  El backend recalcula el recorrido (y el tema) al guardar. */
export function RouteEditor({ route, onSaved, onDeleted, onCancel }: RouteEditorProps) {
  const { t, lang } = useApp();
  const [name, setName] = useState(route.name);
  const [theme, setTheme] = useState<RouteTheme>(route.theme);
  const [description, setDescription] = useState(route.description);
  const [stops, setStops] = useState<RouteStop[]>(route.stops);
  const [candidates, setCandidates] = useState<RouteStop[]>([]);
  const [showCandidates, setShowCandidates] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const anchor = stops[0] ?? route.start;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [nearby, sponsors] = await Promise.all([
          fetchNearbyTrees({ latitude: anchor.latitude, longitude: anchor.longitude, radius: 2000, limit: 200, lang }),
          fetchSponsors(),
        ]);
        if (cancelled) return;
        const chosen = new Set(stops.map((stop) => `${stop.kind}-${stop.id}`));
        const all: RouteStop[] = [
          ...nearby.trees.map((tree) => ({
            kind: 'planta' as const, id: tree.id, name: tree.displayName,
            latitude: tree.latitude, longitude: tree.longitude, speciesId: tree.speciesId,
          })),
          ...sponsors.map((sponsor) => ({
            kind: 'sponsor' as const, id: sponsor.id, name: sponsor.businessName,
            latitude: sponsor.latitude, longitude: sponsor.longitude, speciesId: null,
            businessName: sponsor.businessName, sponsorLocation: sponsor.sponsorLocation,
          })),
        ];
        setCandidates(all
          .filter((stop) => !chosen.has(`${stop.kind}-${stop.id}`))
          .sort((a, b) => metersBetween(anchor, a) - metersBetween(anchor, b))
          .slice(0, MAX_CANDIDATES));
      } catch { if (!cancelled) setCandidates([]); }
    })();
    return () => { cancelled = true; };
  }, [anchor.latitude, anchor.longitude, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  const preview = useMemo(() => ({ ...route, name, theme, description, stops }), [route, name, theme, description, stops]);

  async function handleSave() {
    if (stops.length < 2) { setError(t('routes.editNeedStops')); return; }
    setSaving(true);
    setError('');
    try {
      const changes: RouteEdit = { name, theme, description, stops };
      onSaved(await saveRoute(route.id, changes));
    } catch { setError(t('routes.editError')); setSaving(false); }
  }

  async function handleDelete() {
    setSaving(true);
    try { await removeRoute(route.id); onDeleted(); }
    catch { setError(t('routes.editError')); setSaving(false); }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label className="text-caption font-semibold text-muted" htmlFor="edit-name">{t('routes.editName')}</label>
        <input id="edit-name" value={name} onChange={(event) => setName(event.target.value)}
          className="min-h-11 rounded-control border border-line bg-surface px-3 text-body text-ink" />
        <label className="text-caption font-semibold text-muted" htmlFor="edit-theme">{t('routes.editTheme')}</label>
        <select id="edit-theme" value={theme} onChange={(event) => setTheme(event.target.value as RouteTheme)}
          className="min-h-11 rounded-control border border-line bg-surface px-3 text-body text-ink">
          {THEMES.map((value) => <option key={value} value={value}>{t(`routes.theme.${value}`)}</option>)}
        </select>
        <label className="text-caption font-semibold text-muted" htmlFor="edit-desc">{t('routes.editDescription')}</label>
        <textarea id="edit-desc" value={description} onChange={(event) => setDescription(event.target.value)}
          className="min-h-20 rounded-control border border-line bg-surface p-3 text-small text-ink" />
      </div>

      <section aria-label={t('routes.stopsList')}>
        <h2 className="font-display text-body font-bold">{t('routes.stopsList')}</h2>
        <ol className="mt-2 flex flex-col gap-1">
          {stops.map((stop, index) => (
            <li key={`${stop.kind}-${stop.id}-${index}`} className="flex items-center gap-2 rounded-control px-2 py-2 text-small">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent text-caption font-bold text-on-accent">{index + 1}</span>
              <span className="min-w-0 flex-1">{stop.name}</span>
              <button type="button" onClick={() => setStops((current) => current.filter((_, i) => i !== index))}
                aria-label={`${t('routes.removeStop')} ${stop.name}`}
                className="min-h-11 px-2 text-caption font-semibold text-danger">×</button>
            </li>
          ))}
        </ol>
        <button type="button" onClick={() => setShowCandidates((open) => !open)}
          className="mt-2 min-h-11 rounded-control bg-accent-soft px-3 text-small font-semibold text-ink">
          {t('routes.addStop')}
        </button>
        {showCandidates && (
          <div className="mt-2 rounded-card border border-line p-2">
            <p className="mb-2 text-caption text-muted">{t('routes.stopHint')}</p>
            <ul className="flex flex-col gap-1">
              {candidates.map((stop) => {
                const distance = metersBetween(anchor, stop);
                return <li key={`${stop.kind}-${stop.id}`}>
                  <button type="button" onClick={() => { setStops((current) => [...current, stop]); setShowCandidates(false); }}
                    className="flex min-h-11 w-full items-center gap-2 rounded-control px-2 text-left text-small hover:bg-surface-2">
                    <span className="min-w-0 flex-1">{stop.name}</span>
                    <span className="tabular-nums text-caption text-muted">{formatDistance(distance, lang)}</span>
                    {distance > 1500 && <span className="text-caption text-danger" aria-label={t('routes.farStop')}>!</span>}
                  </button>
                </li>;
              })}
            </ul>
          </div>
        )}
      </section>

      <section aria-label={t('routes.preview')}>
        <h2 className="font-display text-body font-bold">{t('routes.preview')}</h2>
        <div className="mt-2 h-48 overflow-hidden rounded-card">
          <RouteMap route={preview} />
        </div>
      </section>

      {error && <p role="alert" className="text-small text-danger">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={saving} onClick={handleSave}
          className="min-h-11 rounded-full bg-accent px-4 text-small font-bold text-on-accent disabled:opacity-60">
          {t('routes.save')}
        </button>
        <button type="button" onClick={onCancel} className="min-h-11 rounded-full bg-surface px-4 text-small font-semibold text-accent">
          {t('routes.cancel')}
        </button>
        <button type="button" onClick={() => setConfirmDelete(true)}
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-surface px-4 text-small font-semibold text-danger">
          <Trash2 size={15} aria-hidden="true" />{t('routes.delete')}
        </button>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-[1300] grid place-items-center bg-ink/40 p-4" role="presentation">
          <section role="alertdialog" aria-modal="true" aria-labelledby="delete-route-title"
            className="w-full max-w-sm rounded-card bg-surface p-5 shadow-float">
            <h2 id="delete-route-title" className="font-display text-heading font-semibold text-ink">{t('routes.confirmDelete')}</h2>
            <p className="mt-2 text-small text-muted">{route.name}</p>
            <div className="mt-4 flex gap-2">
              <button type="button" disabled={saving} onClick={handleDelete}
                className="min-h-11 rounded-full bg-danger px-4 text-small font-bold text-on-accent disabled:opacity-60">
                {t('routes.confirm')}
              </button>
              <button type="button" onClick={() => setConfirmDelete(false)}
                className="min-h-11 rounded-full bg-surface-2 px-4 text-small font-semibold text-ink">
                {t('routes.cancel')}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
