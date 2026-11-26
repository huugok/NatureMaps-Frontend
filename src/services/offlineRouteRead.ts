import { routeTileCache } from './routeTileCache';
import type { Language } from '../types/language';
import type { FichaDetail } from './ficha';
import { routeStore } from './offlineRouteStorage';

/** Prioriza el idioma pedido; si no existe, mantiene el idioma real de la copia. */
export async function savedSpecies(id: number, lang: Language): Promise<FichaDetail | undefined> {
  const records = (await routeStore().all()).sort((a, b) => Number(b.lang === lang) - Number(a.lang === lang)
    || b.downloadedAt.localeCompare(a.downloadedAt));
  for (const record of records) {
    const species = record.packet.species.find((item) => item.id === id);
    if (!species) continue;
    const image = record.images.find((item) => item.url === species.image?.url);
    if (!image || !species.image) return species;
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(image.blob);
    });
    return { ...species, image: { ...species.image, url: dataUrl } };
  }
  return undefined;
}


/** Lee solo cachés de descargas completas, sin abrir conexiones al proveedor. */
export async function getRouteCachedTile(url: string): Promise<Blob | undefined> {
  try {
    for (const record of await routeStore().all()) {
      if (!record.tiles?.keys.includes(url)) continue;
      const blob = await routeTileCache(record.tiles.cacheName).get(url);
      if (blob) return blob;
    }
  } catch { /* El mapa sigue pudiendo consultar las zonas descargadas o la red. */ }
  return undefined;
}
