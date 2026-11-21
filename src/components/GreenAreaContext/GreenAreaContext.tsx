import { Trees } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { useRemote } from '../../hooks/useRemote';
import { formatDistance } from '../../i18n/format';
import { fetchGreenAreaAt } from '../../services/greenAreas';
import type { GreenAreaAt } from '../../types/greenArea';
import { ListItem } from '../ui/ListItem';

export interface GreenAreaContextProps {
  latitude: number;
  longitude: number;
  /** Se llama antes de navegar (p. ej. para cerrar un diálogo o un overlay). */
  onOpen?: () => void;
}

/**
 * «Entorno verde» de un punto (NM-08, PA 3012): la zona verde en la que está
 * un POI, o el parque más cercano, con acceso a su ficha y sus artículos. Se
 * resuelve por coordenadas, así que sirve para cualquier ficha con posición.
 * Si el punto no tiene ninguna zona verde cerca, no pinta nada: una sección
 * vacía no aporta y un fallo de red aquí no debe romper la ficha del POI.
 */
export function GreenAreaContext({ latitude, longitude, onOpen }: GreenAreaContextProps) {
  const { t, lang } = useApp();
  const { state } = useRemote<GreenAreaAt>(
    `${latitude},${longitude}`,
    (signal) => fetchGreenAreaAt(latitude, longitude, signal),
  );

  if (state.status !== 'ready' || state.data.area === null) return null;
  const { area, relation, distance } = state.data;
  const title = relation === 'inside'
    ? t('areaContext.inside', { name: area.groupName })
    : t('areaContext.near', { name: area.groupName, distance: formatDistance(distance ?? 0, lang) });

  return (
    <section aria-labelledby="green-area-context">
      <h2 id="green-area-context" className="font-display text-heading text-ink">{t('areaContext.title')}</h2>
      <div className="mt-2">
        <ListItem
          icon={Trees}
          title={title}
          subtitle={t('areaContext.open')}
          to={`/zona/${area.groupSlug}`}
          {...(onOpen ? { onClick: onOpen } : {})}
        />
      </div>
    </section>
  );
}
