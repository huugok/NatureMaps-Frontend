import { apiGet } from './api';
import { sponsorCache } from './offlineStorage';

/** Comercios patrocinadores de las rutas, para pintarlos en el mapa principal. */
export interface Sponsor {
  id: number;
  name: string;
  businessName: string;
  sponsorLocation: string;
  latitude: number;
  longitude: number;
}

const TTL_MS = 60 * 60 * 1000;

export async function fetchSponsors(signal?: AbortSignal): Promise<Sponsor[]> {
  const cached = await sponsorCache().get().catch(() => undefined);
  if (cached && Date.now() - cached.savedAt < TTL_MS) return cached.items as Sponsor[];
  const data: unknown = await apiGet('/sponsors', signal);
  const items = Array.isArray(data) ? data as Sponsor[] : [];
  void sponsorCache().put(items).catch(() => undefined);
  return items;
}
