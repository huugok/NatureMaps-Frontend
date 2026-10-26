import { useState } from 'react';
import {
  AVISO_CONFIANZA_BAJA,
  CONFIANZA_MINIMA,
  CONFIRMACION_ELECCION,
  EspeciesAlternativas,
  SUBTITULO,
  SUBTITULO_CANDIDATAS,
  TITULO,
  TITULO_CANDIDATAS,
} from '../EspeciesAlternativas';
import type { PlantIdentification } from '../../types/identify';
import type { CameraMode } from './types';

type IdentificationStatus = 'idle' | 'identifying' | 'completed' | 'error';

export interface CameraIdentificationResultProps {
  /** Estado del envío de la foto al backend. */
  status: IdentificationStatus;
  /** Modo de la cámara: la identificación solo aplica a plantas. */
  mode: CameraMode;
  /** Respuesta del backend con las candidatas, si ya llegó. */
  results: PlantIdentification | null;
  /** Mensaje legible cuando la identificación falla. */
  error: string | null;
  /** Reintenta el envío de la foto actual. */
  onRetry: () => void;
}

/**
 * UT F05 (RF18 · PA 689): resultado de la identificación dentro del escaneo
 * con cámara. Si la mejor coincidencia no llega a `CONFIANZA_MINIMA`, ofrece
 * las especies alternativas ordenadas por confianza para que el usuario elija;
 * si no, mantiene el listado de candidatas.
 */
export function CameraIdentificationResult({
  status,
  mode,
  results,
  error,
  onRetry,
}: CameraIdentificationResultProps) {
  // La elección se guarda junto a la identificación a la que pertenece: cuando
  // llega un resultado nuevo, la comparación falla y la elección desaparece sin
  // necesidad de un efecto que reinicie estado.
  const [eleccion, setEleccion] = useState<{
    results: PlantIdentification | null;
    nombre: string;
  } | null>(null);
  const elegida = eleccion?.results === results ? eleccion.nombre : null;

  if (status === 'idle') {
    return null;
  }

  const mejorCoincidencia = results?.results[0] ?? null;
  const confianzaBaja = mejorCoincidencia !== null && mejorCoincidencia.score < CONFIANZA_MINIMA;

  return (
    <div
      aria-live="polite"
      className="mb-4 max-h-[60vh] overflow-y-auto rounded-xl bg-black/65 p-3 text-sm backdrop-blur-sm"
    >
      {status === 'identifying' && <p role="status">Enviando la foto a Pl@ntNet…</p>}

      {status === 'completed' && results && (
        <>
          {results.results.length === 0 && (
            <p role="status">Pl@ntNet no ha encontrado candidatas para esta foto.</p>
          )}

          {results.results.length > 0 && (
            <div className="rounded-lg bg-neutral-100 p-3 text-neutral-900">
              {confianzaBaja && (
                <p className="text-sm text-amber-800">{AVISO_CONFIANZA_BAJA}</p>
              )}
              {/* Mismas fichas en los dos casos: alternativas con confianza
                  baja, candidatas cuando la identificación es concluyente. */}
              <EspeciesAlternativas
                matches={results.results}
                selectedName={elegida}
                onSelect={(nombre) => setEleccion({ results, nombre })}
                title={confianzaBaja ? TITULO : TITULO_CANDIDATAS}
                subtitle={confianzaBaja ? SUBTITULO : SUBTITULO_CANDIDATAS}
              />
              {elegida !== null && (
                <p role="status" className="mt-2 text-sm font-medium text-emerald-800">
                  {CONFIRMACION_ELECCION}: {elegida}
                </p>
              )}
            </div>
          )}
        </>
      )}

      {status === 'error' && mode === 'planta' && (
        <div>
          <p role="alert">No se ha podido identificar la foto.</p>
          {error && <p className="mt-1 text-white/75">{error}</p>}
          <button type="button" onClick={onRetry} className="mt-2 underline underline-offset-2">
            Reintentar
          </button>
        </div>
      )}
    </div>
  );
}

export default CameraIdentificationResult;
