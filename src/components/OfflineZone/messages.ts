import type { StringKey } from '../../i18n/strings';

/** Texto de cada fase de la descarga. */
export const PHASE_TEXT: Record<'detail' | 'plants' | 'tiles' | 'saving', StringKey> = {
  detail: 'offline.phase.detail',
  plants: 'offline.phase.plants',
  tiles: 'offline.phase.tiles',
  saving: 'offline.phase.saving',
};

/** Texto de cada motivo de fallo (en la tarjeta de la zona y en la lista de Rutas). */
export const ERROR_TEXT: Record<string, StringKey> = {
  network: 'offline.error.network',
  'storage-full': 'offline.error.storage',
  'too-large': 'offline.error.tooLarge',
  unsupported: 'offline.error.unsupported',
  generic: 'offline.error.generic',
};
