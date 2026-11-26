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
