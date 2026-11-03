import type { PlantIdentification, PlantMatch } from '../../types/identify';

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
  /** Abre la ficha de la especie identificada o de una alternativa (PA 1250). */
  onOpenSpecies?: (match: PlantMatch, photo: string | null) => void;
  identificationStatus?: 'idle' | 'identifying' | 'completed' | 'error';
  identificationResults?: PlantIdentification | null;
  identificationError?: string | null;
}

