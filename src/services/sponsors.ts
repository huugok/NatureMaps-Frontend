import { apiGet } from './api';

/** Comercios patrocinadores de las rutas, para pintarlos en el mapa principal. */
export interface Sponsor {
  id: number;
  name: string;
  businessName: string;
  sponsorLocation: string;
  latitude: number;
  longitude: number;
}

export async function fetchSponsors(signal?: AbortSignal): Promise<Sponsor[]> {
  const data: unknown = await apiGet('/sponsors', signal);
  return Array.isArray(data) ? data as Sponsor[] : [];
}
