import { Trees } from 'lucide-react';
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
    <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-3 bg-neutral-100 px-6 text-center" role="status">
      <Trees size={40} className="text-emerald-700" aria-hidden="true" />
      <p className="text-sm text-neutral-600">{mensaje}</p>
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
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-3 bg-neutral-100 px-6 text-center">
      <Trees size={40} className="text-neutral-400" aria-hidden="true" />
      <p role="alert" className="text-sm text-neutral-600">
        {mensaje}
      </p>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={onBack}
          className="min-h-11 rounded-xl border border-neutral-200 bg-white px-4 text-sm font-semibold text-neutral-700 shadow-sm hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
        >
          Volver
        </button>
        <button
          type="button"
          onClick={onRetry}
          className="min-h-11 rounded-xl bg-emerald-800 px-4 text-sm font-semibold text-white shadow-sm hover:bg-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
        >
          Reintentar
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
  if (list.status === 'loading') {
    return <FichaEstado mensaje="Cargando el catálogo de especies…" />;
  }

  if (list.status === 'error') {
    return (
      <FichaError
        mensaje="No se ha podido cargar el catálogo de especies."
        onBack={onBack}
        onRetry={onRetryList}
      />
    );
  }

  if (list.items.length === 0) {
    return <FichaEstado mensaje="El catálogo todavía no tiene especies." />;
  }

  if (detail.status === 'loading') {
    return <FichaEstado mensaje={`Cargando la ficha de ${list.items[index]?.scientificName ?? 'la especie'}…`} />;
  }

  if (detail.status === 'error') {
    return (
      <FichaError
        mensaje="No se ha podido cargar la ficha de la especie."
        onBack={onBack}
        onRetry={onRetryDetail}
      />
    );
  }

  return (
    <div className="min-h-full bg-neutral-100">
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
