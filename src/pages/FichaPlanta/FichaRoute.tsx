import { Trees } from 'lucide-react';
import { useApp } from '../../context/useApp';
import type { FichaListItem } from '../../services/ficha';
import { FichaPlantaPage } from './FichaPlantaPage';
import type { FichaEspecie } from './types';

export type FichaListState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; items: FichaListItem[] };

export type FichaDetailState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; especie: FichaEspecie };

export interface FichaRouteProps {
  list: FichaListState;
  index: number;
  detail: FichaDetailState;
  onBack: () => void;
  onRetryList: () => void;
  onRetryDetail: () => void;
  onPrevious?: (() => void) | undefined;
  onNext?: (() => void) | undefined;
  onViewOnMap: () => void;
}

function FichaEstado({ mensaje }: { mensaje: string }) {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-3 bg-surface-2 px-6 text-center" role="status">
      <Trees size={40} className="text-accent" aria-hidden="true" />
      <p className="text-body text-muted">{mensaje}</p>
    </div>
  );
}

function FichaError({
  mensaje,
  onBack,
  onRetry,
}: {
  mensaje: string;
  onBack: () => void;
  onRetry: () => void;
}) {
  const { t } = useApp();
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-3 bg-surface-2 px-6 text-center">
      <Trees size={40} className="text-muted-2" aria-hidden="true" />
      <p role="alert" className="text-body text-muted">
        {mensaje}
      </p>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={onBack}
          className="min-h-11 rounded-card border border-line bg-surface px-4 text-body font-semibold text-ink shadow-raised hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {t('common.back')}
        </button>
        <button
          type="button"
          onClick={onRetry}
          className="min-h-11 rounded-card bg-accent px-4 text-body font-semibold text-on-accent shadow-raised hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {t('common.retry')}
        </button>
      </div>
    </div>
  );
}

/** Ruta /ficha: catálogo real con navegación Anterior/Siguiente y estados honestos. */
export function FichaRoute({
  list,
  index,
  detail,
  onBack,
  onRetryList,
  onRetryDetail,
  onPrevious,
  onNext,
  onViewOnMap,
}: FichaRouteProps) {
  const { t } = useApp();

  if (list.status === 'loading') {
    return <FichaEstado mensaje={t('ficha.loadingList')} />;
  }

  if (list.status === 'error') {
    return <FichaError mensaje={t('ficha.errorList')} onBack={onBack} onRetry={onRetryList} />;
  }

  if (list.items.length === 0) {
    return <FichaEstado mensaje={t('ficha.emptyList')} />;
  }

  if (detail.status === 'loading') {
    return <FichaEstado mensaje={t('ficha.loadingDetail', { name: list.items[index]?.scientificName ?? '' })} />;
  }

  if (detail.status === 'error') {
    return <FichaError mensaje={t('ficha.errorDetail')} onBack={onBack} onRetry={onRetryDetail} />;
  }

  return (
    <div className="min-h-full bg-surface-2">
      <FichaPlantaPage
        species={detail.especie}
        position={index}
        total={list.items.length}
        onBack={onBack}
        onViewOnMap={onViewOnMap}
        {...(onPrevious !== undefined ? { onPrevious } : {})}
        {...(onNext !== undefined ? { onNext } : {})}
      />
    </div>
  );
}
