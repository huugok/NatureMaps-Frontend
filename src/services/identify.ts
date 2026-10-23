import type { PlantIdentification } from '../types/identify';

// URL del backend (NatureMaps-Backend). Se puede ajustar con VITE_API_URL en .env;
// por defecto apunta a localhost, como la API en desarrollo.
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

/** Envia la foto al backend (POST /plants/identify) y devuelve las especies candidatas con su puntuación. */
export async function identifyPlant(image: Blob, filename = 'planta.jpg'): Promise<PlantIdentification> {
  const form = new FormData();
  form.append('images', image, filename);

  let response: Response;
  try {
    response = await fetch(`${API_URL}/plants/identify`, { method: 'POST', body: form });
  } catch {
    // Error de red / servidor caído: el mensaje no expone detalles internos.
    throw new Error('No se ha podido contactar con el servidor de identificación');
  }

  if (!response.ok) {
    // El backend responde { error: string } cuando Pl@ntNet falla; si es legible, se muestra.
    let detail = '';
    try {
      const body = (await response.json()) as { error?: unknown };
      if (typeof body.error === 'string') {
        detail = body.error;
      }
    } catch {
      // El cuerpo no es JSON: se queda el mensaje genérico.
    }
    throw new Error(
      detail !== ''
        ? `No se ha completado la identificación: ${detail}`
        : `No se ha completado la identificación (HTTP ${response.status})`,
    );
  }

  return (await response.json()) as PlantIdentification;
}
