import { useState } from 'react';
import type { PlantIdentification, PlantMatch } from '../../types/identify';
import { ResultadoEscaneo } from '../ResultadoEscaneo';
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
  /** Foto enviada, para la cabecera del resultado. */
  photo: string | null;
  /** Reintenta el envío de la foto actual. */
  onRetry: () => void;
  /** Abre la ficha de la especie más probable. */
  onOpenSpecies?: (match: PlantMatch) => void;
  /** Vuelve atrás desde el resultado. */
  onBack: () => void;
  /** Descarta la foto y vuelve a la cámara para repetirla. */
  onRepeatPhoto: () => void;
}

/**
 * UT F05 (RF18 · PA 689): resultado de la identificación dentro del escaneo
 * con cámara. Muestra la foto, la especie más probable (con su ficha) y las
 * alternativas ordenadas por confianza para que el usuario elija.
 */
export function CameraIdentificationResult({
  status,
  mode,
  results,
  error,
  photo,
  onRetry,
  onOpenSpecies,
  onBack,
  onRepeatPhoto,
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

  if (status === 'completed' && results !== null) {
    return (
      <ResultadoEscaneo
        photoUrl={photo}
        matches={results.results}
        selectedName={elegida}
        onSelectAlternative={(nombre) => setEleccion({ results, nombre })}
        onOpenPrimary={onOpenSpecies}
        onBack={onBack}
        onRepeatPhoto={onRepeatPhoto}
      />
    );
  }

  if (status === 'identifying') {
    return (
      <div
        aria-live="polite"
        className="mb-4 rounded-xl bg-black/65 p-3 text-sm text-white backdrop-blur-sm"
      >
        <p role="status">Enviando la foto a Pl@ntNet…</p>
      </div>
    );
  }

  if (status === 'error' && mode === 'planta') {
    return (
      <div
        aria-live="polite"
        className="mb-4 rounded-xl bg-black/65 p-3 text-sm text-white backdrop-blur-sm"
      >
        <p role="alert">No se ha podido identificar la foto.</p>
        {error && <p className="mt-1 text-white/75">{error}</p>}
        <button type="button" onClick={onRetry} className="mt-2 underline underline-offset-2">
          Reintentar
        </button>
      </div>
    );
  }

  return null;
}

export default CameraIdentificationResult;
