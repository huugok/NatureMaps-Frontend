import { normalizarNombreCientifico } from '../utils/speciesName';

// Foto propia de cada especie (PA 2941): la captura que el usuario guarda al
// identificar una planta sustituye a la imagen del catálogo cuando se vuelve a
// abrir su ficha (desde el resultado, el mapa o la ruta /ficha).
//
// Vive en localStorage porque el backend todavía no acepta fotos de usuario:
// la foto se guarda en este dispositivo, no se publica. Este módulo es el
// único escritor de la clave `naturemaps.speciesPhotos`.

export const SPECIES_PHOTO_STORAGE_KEY = 'naturemaps.speciesPhotos';

/** Fotos que se conservan por dispositivo. Cada captura pesa unos cientos de
 * KB y localStorage ronda los 5 MB: las más antiguas se descartan. */
export const MAX_SPECIES_PHOTOS = 6;

interface FotoGuardada {
  /** Data URL de la captura. */
  photoUrl: string;
  /** ISO de cuando se guardó; decide qué foto se descarta al podar. */
  savedAt: string;
}

type Registro = Record<string, FotoGuardada>;

/**
 * Clave estable entre catálogo, mapa y Pl@ntNet: el nombre científico
 * normalizado. Los ids del backend cambian entre entornos y el inventario no
 * siempre informa la especie, así que no sirven como clave.
 */
export function speciesPhotoKey(species: { scientificName: string }): string {
  return normalizarNombreCientifico(species.scientificName);
}

function leer(): Registro {
  try {
    const stored = window.localStorage.getItem(SPECIES_PHOTO_STORAGE_KEY);
    if (stored === null) return {};
    const parsed: unknown = JSON.parse(stored);
    if (typeof parsed !== 'object' || parsed === null) return {};
    return parsed as Registro;
  } catch {
    // Sin localStorage (modo privado) o con datos corruptos: no hay fotos.
    return {};
  }
}

function escribir(registro: Registro): boolean {
  try {
    window.localStorage.setItem(SPECIES_PHOTO_STORAGE_KEY, JSON.stringify(registro));
    return true;
  } catch {
    // Cuota llena o almacenamiento bloqueado: la foto no se puede persistir.
    return false;
  }
}

/** Deja las `MAX_SPECIES_PHOTOS` más recientes. */
function podar(registro: Registro): Registro {
  const entradas = Object.entries(registro).sort(([, a], [, b]) =>
    b.savedAt.localeCompare(a.savedAt),
  );
  return Object.fromEntries(entradas.slice(0, MAX_SPECIES_PHOTOS));
}

/** Foto propia guardada para la especie, o `null` si no hay ninguna. */
export function getSpeciesPhoto(species: { scientificName: string }): string | null {
  const clave = speciesPhotoKey(species);
  if (clave === '') return null;
  const foto = leer()[clave];
  return typeof foto?.photoUrl === 'string' && foto.photoUrl.length > 0 ? foto.photoUrl : null;
}

/**
 * Guarda la foto de la especie. Devuelve `false` cuando el dispositivo no
 * puede conservarla (sin localStorage o sin cuota) para que quien llama pueda
 * seguir enseñando la foto en la ficha abierta sin prometer persistencia.
 */
export function saveSpeciesPhoto(
  species: { scientificName: string },
  photoUrl: string,
): boolean {
  const clave = speciesPhotoKey(species);
  if (clave === '' || photoUrl === '') return false;

  const registro = leer();
  registro[clave] = { photoUrl, savedAt: new Date().toISOString() };
  if (escribir(podar(registro))) return true;

  // Justo en el límite: se reintenta dejando solo la foto recién guardada.
  return escribir({ [clave]: registro[clave] });
}
