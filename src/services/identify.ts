import type { IdentificationFailure, PlantIdentification } from '../types/identify';

// URL del backend (NatureMaps-Backend). Se puede ajustar con VITE_API_URL en .env;
// por defecto apunta a localhost, como la API en desarrollo.
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

/** Los servicios comunican códigos; los componentes eligen el texto traducido. */
export class IdentificationError extends Error implements IdentificationFailure {
  readonly code: IdentificationFailure['code'];
  readonly status?: number;

  constructor(code: IdentificationFailure['code'], status?: number) {
    super(code);
    this.name = 'IdentificationError';
    this.code = code;
    this.status = status;
  }
}

/** Envia la foto al backend (POST /plants/identify) y devuelve las especies candidatas con su puntuación. */
export async function identifyPlant(image: Blob, filename = 'planta.jpg'): Promise<PlantIdentification> {
  const form = new FormData();
  form.append('images', image, filename);

  let response: Response;
  try {
    response = await fetch(`${API_URL}/plants/identify`, { method: 'POST', body: form });
  } catch {
    // Error de red / servidor caído: el mensaje no expone detalles internos.
    throw new IdentificationError('unreachable');
  }

  if (!response.ok) {
    // El texto libre del backend puede estar en otro idioma y contener detalles internos.
    throw new IdentificationError('request', response.status);
  }

  return (await response.json()) as PlantIdentification;
}
