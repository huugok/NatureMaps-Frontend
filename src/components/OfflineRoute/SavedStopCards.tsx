import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useApp } from '../../context/useApp';
import { Button } from '../ui/Button';
import { routeStore } from '../../services/offlineRouteStorage';
import type { OfflineRouteRecord } from '../../types/offlineRoute';

export interface SavedStopCardsProps {
  routeId: number;
  /** Muestra solo esta parada (su ficha se abre desde la lista o el mapa). */
  activeIndex?: number;
  /** Por defecto se listan todas las fichas guardadas. */
  showList?: boolean;
  onClose?: () => void;
}

/** También los POIs y las plantas sin especie enlazada se pueden consultar
 * dentro de la ruta. Las URLs blob se liberan al cambiar/borrar la descarga. */
export function SavedStopCards({ routeId, activeIndex, showList = true, onClose }: SavedStopCardsProps) {
  const { t } = useApp();
  const [saved, setSaved] = useState<{ record: OfflineRouteRecord; images: Record<string, string> }>();
  useEffect(() => {
    let active = true;
    let generation = 0;
    let urls: string[] = [];
    const release = () => { urls.forEach((url) => URL.revokeObjectURL(url)); urls = []; };
    const refresh = () => {
      const current = ++generation;
      void routeStore().get(routeId).then((record) => {
        if (!active || current !== generation) return;
        release();
        const images = Object.fromEntries((record?.images ?? []).map(({ url, blob }) => [url, URL.createObjectURL(blob)]));
        urls = Object.values(images);
        setSaved(record ? { record, images } : undefined);
      }).catch(() => undefined);
    };
    refresh();
    window.addEventListener('naturemaps-route-downloads', refresh);
    return () => { active = false; release(); window.removeEventListener('naturemaps-route-downloads', refresh); };
  }, [routeId]);
  if (!saved) return null;
  if (!showList && activeIndex === undefined) return null;
  const { record, images } = saved;
  const indices = activeIndex === undefined
    ? record.packet.stops.map((_, index) => index)
    : activeIndex >= 0 && activeIndex < record.packet.stops.length ? [activeIndex] : [];
  if (indices.length === 0) return null;
  return <section aria-label={t('routeOffline.cards')}>
    <div className="flex items-center justify-between gap-3">
      <h2 className="font-display text-heading">{t('routeOffline.cards')}</h2>
      {activeIndex !== undefined && onClose && (
        <Button variant="ghost" size="sm" icon={X} onClick={onClose}>{t('routeOffline.closeCard')}</Button>
      )}
    </div>
    <ol className={showList ? 'mt-2 flex flex-col gap-3' : 'mt-2'}>{indices.map((index) => {
      const stop = record.packet.stops[index];
      if (!stop) return null;
      const species = record.packet.species.find((item) => item.id === stop.plant?.speciesId);
      const name = record.packet.route.stops[index]?.name ?? stop.poi?.name ?? stop.plant?.displayName;
      const image = stop.poi?.image ?? species?.image;
      const content = stop.poi?.profile?.description ?? species?.content;
      const sources = species?.profile?.sources ?? [];
      const sourceUrl = stop.poi?.profile?.sourceUrl ?? stop.poi?.sourceUrl ?? stop.plant?.sourceUrl;
      const dataSource = stop.poi?.dataSource ?? stop.plant?.dataSource;
      return <li key={`${index}-${stop.kind}-${stop.id}`} className="rounded-card bg-surface p-4">
        <details open={activeIndex !== undefined}>
          <summary className="min-h-12 cursor-pointer font-display text-body">{index + 1}. {name}</summary>
          {image && images[image.url] && <figure className="my-2">
            <img src={images[image.url]} alt={name ?? ''} className="max-h-64 w-full rounded-card object-cover" />
            <figcaption className="mt-1 text-small text-muted"><a className="underline" href={image.sourceUrl}>{image.attribution}</a> · <a className="underline" href={image.licenseUrl}>{image.license}</a></figcaption>
          </figure>}
          <p className="font-body text-body whitespace-pre-line">{content ?? t('routeOffline.noContent')}</p>
          {species?.profile?.family && <p className="mt-2 text-small">{species.profile.family}</p>}
          {species?.profile?.flowering && <p className="mt-2 text-small">{species.profile.flowering}</p>}
          {species?.profile?.curiosity && <p className="mt-2 font-body text-body">{species.profile.curiosity}</p>}
          {species?.enrichment && <p className="mt-2 text-small text-muted"><a className="underline" href={species.enrichment.url}>{species.enrichment.source}</a> · {species.enrichment.license}</p>}
          {stop.poi?.profile && <p className="mt-2 text-small text-muted">{stop.poi.profile.language} · {stop.poi.profile.license}</p>}
          <ul className="mt-2 text-small text-muted">{sources.map((source) => <li key={source.url}><a className="underline" href={source.url}>{source.name}</a> · {source.description}</li>)}</ul>
          {dataSource && <p className="mt-2 text-small text-muted">{dataSource.attribution} · <a className="underline" href={dataSource.licenseUrl}>{dataSource.license}</a></p>}
          {sourceUrl && <a className="mt-2 inline-block text-small text-accent underline" href={sourceUrl}>{t('routeOffline.source')}</a>}
        </details>
      </li>;
    })}</ol>
  </section>;
}
