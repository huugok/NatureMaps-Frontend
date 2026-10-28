import type { PlantIdentification } from '../../types/identify';

export type CameraMode = 'planta' | 'monumento';

export type PermissionStatus = 'checking' | 'prompt' | 'granted' | 'denied';

export interface SavedPhoto {
  id: string;
  dataUrl: string;
  mode: CameraMode;
  label: string;
  createdAt: string;
}

export interface CameraScreenProps {
  /**
   * Callback invoked when the user exits the camera screen (clicks back or close).
   */
  onClose: () => void;
  /**
   * Initial mode for the camera selector ('planta' or 'monumento'). Defaults to 'planta'.
   */
  initialMode?: CameraMode;
  /**
   * Optional callback when a photo is captured or selected from gallery.
   */
  onPhotoCaptured?: (photoDataUrl: string, mode: CameraMode) => void;
  onIdentifyPhoto?: (photoDataUrl: string, mode: CameraMode) => void;
  identificationStatus?: 'idle' | 'identifying' | 'completed' | 'error';
  identificationResults?: PlantIdentification | null;
  identificationError?: string | null;
  /**
   * Especie identificada cuya ficha existe en el catálogo (match client-side
   * del nombre científico contra GET /species). Null si no hay match aún.
   */
  identifiedSpecies?: { name: string } | null;
  /** Callback al pulsar "Ver ficha de …" con la especie identificada. */
  onOpenSpeciesFicha?: () => void;
}

