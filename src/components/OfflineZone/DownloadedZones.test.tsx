import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { hesperidesDetail } from '../../test/greenAreaFixtures';
import { renderWithProviders } from '../../test/renderWithProviders';
import type { OfflineZoneRecord } from '../../types/offline';
import { createMemoryStore, createMemoryTileCache, setOfflineStorage } from '../../services/offlineStorage';
import { resetDownloadRegistry, startDownload } from '../../services/downloadRegistry';
import { OfflineError } from '../../services/offlineError';
import { DownloadedZones } from './DownloadedZones';

const support = vi.hoisted(() => ({ supported: true, free: null as number | null }));
vi.mock('../../services/offlineStorage', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../services/offlineStorage')>()),
  isOfflineSupported: () => support.supported,
  freeStorageBytes: async () => support.free,
}));
const download = vi.hoisted(() => ({ run: vi.fn() }));
vi.mock('../../services/offlineDownload', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../services/offlineDownload')>()),
  downloadZone: (options: unknown) => download.run(options),
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
    support.free = null;
    download.run.mockReset();
    setOfflineStorage({ store, tiles });
    for (const record of await store.all()) await store.delete(record.groupSlug);
  });
  afterEach(() => {
    cleanup();
    resetDownloadRegistry();
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

  it('elimina una descarga, tras confirmar, y borra sus teselas', async () => {
    await store.put(zone('jardin-del-turia', 'Jardín del Turia', '2026-11-10T10:00:00Z'));
    await tiles.put('https://tile.openstreetmap.org/15/jardin-del-turia.png', new Blob(['x']));
    renderWithProviders(<DownloadedZones />);
    await userEvent.click(await screen.findByRole('button', { name: 'Eliminar la descarga de Jardín del Turia' }));
    expect(await store.get('jardin-del-turia')).toBeDefined();
    expect(screen.getByText(/Se liberarán 2 MB/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Sí, eliminar' }));
    expect(await screen.findByText(/Aún no has descargado ninguna zona/)).toBeInTheDocument();
    expect(await store.get('jardin-del-turia')).toBeUndefined();
    expect(await tiles.get('https://tile.openstreetmap.org/15/jardin-del-turia.png')).toBeUndefined();
  });

  it('conservar la descarga cancela la eliminación', async () => {
    await store.put(zone('jardin-del-turia', 'Jardín del Turia', '2026-11-10T10:00:00Z'));
    renderWithProviders(<DownloadedZones />);
    await userEvent.click(await screen.findByRole('button', { name: 'Eliminar la descarga de Jardín del Turia' }));
    await userEvent.click(screen.getByRole('button', { name: 'Conservar' }));
    expect(await store.get('jardin-del-turia')).toBeDefined();
    expect(screen.getByRole('link', { name: 'Ver ficha' })).toBeInTheDocument();
  });

  it('resume el espacio ocupado y el libre y indica la fecha de cada descarga', async () => {
    support.free = 5_000_000_000;
    await store.put(zone('jardin-del-turia', 'Jardín del Turia', '2026-11-10T10:00:00Z'));
    await store.put(zone('jardin-de-las-hesperides', 'Jardín de las Hespérides', '2026-11-15T10:00:00Z'));
    renderWithProviders(<DownloadedZones />);
    expect(await screen.findByText(/2 guardadas · 4 MB ocupados/)).toBeInTheDocument();
    expect(await screen.findByText(/5.000 MB libres|5 GB libres|5000 MB libres/)).toBeInTheDocument();
    expect(screen.getAllByText(/^Descargada el /)).toHaveLength(2);
    expect(screen.queryByText(/Queda poco espacio libre/)).not.toBeInTheDocument();
  });

  it('avisa cuando queda poco espacio libre', async () => {
    support.free = 50_000_000;
    await store.put(zone('jardin-del-turia', 'Jardín del Turia', '2026-11-10T10:00:00Z'));
    renderWithProviders(<DownloadedZones />);
    expect(await screen.findByText(/Queda poco espacio libre/)).toBeInTheDocument();
  });

  it('elimina todas las descargas tras confirmar', async () => {
    await store.put(zone('jardin-del-turia', 'Jardín del Turia', '2026-11-10T10:00:00Z'));
    await store.put(zone('jardin-de-las-hesperides', 'Jardín de las Hespérides', '2026-11-15T10:00:00Z'));
    renderWithProviders(<DownloadedZones />);
    await userEvent.click(await screen.findByRole('button', { name: 'Eliminar todas' }));
    expect(screen.getByText(/Se liberarán 4 MB/)).toBeInTheDocument();
    await userEvent.click(within(screen.getByRole('alertdialog', { name: 'Eliminar todas' })).getByRole('button', { name: 'Sí, eliminar' }));
    expect(await screen.findByText(/Aún no has descargado ninguna zona/)).toBeInTheDocument();
    expect(await store.all()).toHaveLength(0);
  });

  it('muestra una descarga en curso con su progreso y permite cancelarla', async () => {
    download.run.mockImplementation(({ signal, onDetail, onProgress }: { signal: AbortSignal; onDetail: (d: typeof hesperidesDetail) => void; onProgress: (p: unknown) => void }) =>
      new Promise((_, reject) => {
        onDetail(hesperidesDetail);
        onProgress({ phase: 'tiles', done: 5, total: 10, fraction: 0.5 });
        signal.addEventListener('abort', () => reject(new DOMException('abortada', 'AbortError')));
      }));
    renderWithProviders(<DownloadedZones />);
    await screen.findByText(/Aún no has descargado ninguna zona/);
    act(() => void startDownload({ groupSlug: hesperidesDetail.groupSlug, lang: 'es' }));
    expect(await screen.findByText(hesperidesDetail.name)).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
    expect(screen.getByText(/Descargando/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: `Cancelar la descarga de ${hesperidesDetail.name}` }));
    expect(await screen.findByText(/Aún no has descargado ninguna zona/)).toBeInTheDocument();
  });

  it('una descarga fallida se puede reintentar o descartar', async () => {
    download.run.mockRejectedValueOnce(new OfflineError('network', 'sin red'));
    renderWithProviders(<DownloadedZones />);
    await screen.findByText(/Aún no has descargado ninguna zona/);
    await act(async () => {
      await startDownload({ groupSlug: 'jardin-del-turia', lang: 'es', name: 'Jardín del Turia' });
    });
    expect(await screen.findByRole('alert')).toHaveTextContent(/Error en la descarga/);
    download.run.mockReturnValueOnce(new Promise(() => undefined));
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText(/Descargando/)).toBeInTheDocument();
    cleanup();
    resetDownloadRegistry();
    download.run.mockRejectedValueOnce(new OfflineError('network', 'sin red'));
    renderWithProviders(<DownloadedZones />);
    await act(async () => {
      await startDownload({ groupSlug: 'jardin-del-turia', lang: 'es', name: 'Jardín del Turia' });
    });
    await userEvent.click(await screen.findByRole('button', { name: 'Descartar' }));
    expect(await screen.findByText(/Aún no has descargado ninguna zona/)).toBeInTheDocument();
  });

  it('en un navegador sin soporte no pinta la sección', () => {
    support.supported = false;
    const { container } = renderWithProviders(<DownloadedZones />);
    expect(container).toBeEmptyDOMElement();
  });
});
