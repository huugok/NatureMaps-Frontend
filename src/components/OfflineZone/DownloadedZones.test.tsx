import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { hesperidesDetail } from '../../test/greenAreaFixtures';
import { renderWithProviders } from '../../test/renderWithProviders';
import type { OfflineZoneRecord } from '../../types/offline';
import { createMemoryStore, createMemoryTileCache, setOfflineStorage } from '../../services/offlineStorage';
import { DownloadedZones } from './DownloadedZones';

const support = vi.hoisted(() => ({ supported: true }));
vi.mock('../../services/offlineStorage', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../services/offlineStorage')>()),
  isOfflineSupported: () => support.supported,
}));

function zone(groupSlug: string, name: string, downloadedAt: string): OfflineZoneRecord {
  return {
    groupSlug, name, lang: 'es', downloadedAt, bbox: hesperidesDetail.bbox, detail: hesperidesDetail,
    plants: [], tiles: { keys: [`https://tile.openstreetmap.org/15/${groupSlug}.png`], minZoom: 13, maxZoom: 17, bytes: 2_000_000 },
  };
}

describe('zonas descargadas en Rutas', () => {
  const store = createMemoryStore();
  const tiles = createMemoryTileCache();
  beforeEach(async () => {
    support.supported = true;
    setOfflineStorage({ store, tiles });
    for (const record of await store.all()) await store.delete(record.groupSlug);
  });
  afterEach(() => {
    cleanup();
    setOfflineStorage();
  });

  it('sin descargas explica cómo hacerlas', async () => {
    renderWithProviders(<DownloadedZones />);
    expect(await screen.findByText(/Aún no has descargado ninguna zona/)).toBeInTheDocument();
  });

  it('lista cada parque, el más reciente primero, con enlaces al mapa y a la ficha', async () => {
    await store.put(zone('jardin-del-turia', 'Jardín del Turia', '2026-11-10T10:00:00Z'));
    await store.put(zone('jardin-de-las-hesperides', 'Jardín de las Hespérides', '2026-11-15T10:00:00Z'));
    renderWithProviders(<DownloadedZones />);
    const titles = (await screen.findAllByRole('heading', { level: 3 })).map((heading) => heading.textContent);
    expect(titles).toEqual(['Jardín de las Hespérides', 'Jardín del Turia']);
    const maps = screen.getAllByRole('link', { name: 'Ver en el mapa' });
    expect(maps[0]).toHaveAttribute('href', '/mapa?zona=jardin-de-las-hesperides');
    expect(screen.getAllByRole('link', { name: 'Ver ficha' })[1]).toHaveAttribute('href', '/zona/jardin-del-turia');
    expect(screen.getAllByText(/2 MB/).length).toBeGreaterThan(0);
  });

  it('elimina una descarga y borra sus teselas', async () => {
    await store.put(zone('jardin-del-turia', 'Jardín del Turia', '2026-11-10T10:00:00Z'));
    await tiles.put('https://tile.openstreetmap.org/15/jardin-del-turia.png', new Blob(['x']));
    renderWithProviders(<DownloadedZones />);
    await userEvent.click(await screen.findByRole('button', { name: 'Eliminar la descarga de Jardín del Turia' }));
    expect(await screen.findByText(/Aún no has descargado ninguna zona/)).toBeInTheDocument();
    expect(await store.get('jardin-del-turia')).toBeUndefined();
    expect(await tiles.get('https://tile.openstreetmap.org/15/jardin-del-turia.png')).toBeUndefined();
  });

  it('en un navegador sin soporte no pinta la sección', () => {
    support.supported = false;
    const { container } = renderWithProviders(<DownloadedZones />);
    expect(container).toBeEmptyDOMElement();
  });
});
