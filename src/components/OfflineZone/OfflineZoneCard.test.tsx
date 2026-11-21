import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { hesperidesDetail } from '../../test/greenAreaFixtures';
import { renderWithProviders } from '../../test/renderWithProviders';
import {
  createMemoryStore, createMemoryTileCache, setOfflineStorage,
} from '../../services/offlineStorage';
import { OfflineZoneCard } from './OfflineZoneCard';

// jsdom no tiene IndexedDB ni Cache API: se da por válido el soporte y se
// sustituye el almacenamiento por uno en memoria.
const support = vi.hoisted(() => ({ supported: true }));
vi.mock('../../services/offlineStorage', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../services/offlineStorage')>()),
  isOfflineSupported: () => support.supported,
  freeStorageBytes: async () => null,
}));

const plantsPage = {
  groupSlug: 'jardin-de-las-hesperides',
  total: 2,
  returned: 2,
  nextOffset: null,
  plants: [
    { id: 1, speciesId: 7, scientificName: 'Citrus × aurantium', commonName: 'Naranjo amargo', displayName: 'Naranjo amargo', latitude: 39.4775, longitude: -0.3882, greenAreaId: 1 },
    { id: 2, speciesId: 7, scientificName: 'Citrus × aurantium', commonName: 'Naranjo amargo', displayName: 'Naranjo amargo', latitude: 39.4776, longitude: -0.3883, greenAreaId: 1 },
  ],
};

/** `fetch` con el backend y las teselas; `tile` decide qué pasa con cada tesela. */
function stubNetwork(tile: (signal?: AbortSignal | null) => Promise<Response>) {
  vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    if (url.includes('tile.openstreetmap.org')) return tile(init?.signal);
    if (url.includes('/plants')) return { ok: true, status: 200, json: async () => plantsPage } as Response;
    return { ok: true, status: 200, json: async () => hesperidesDetail } as Response;
  }));
}

// Objeto plano y no `new Response(blob)`: en jsdom el Blob no es el de Node y Response lo rechaza.
const tileOk = async () => ({ ok: true, status: 200, blob: async () => new Blob(['png-bytes']) }) as Response;

function renderCard() {
  return renderWithProviders(
    <OfflineZoneCard groupSlug="jardin-de-las-hesperides" bbox={hesperidesDetail.bbox} plantCount={1250} />,
  );
}

describe('descarga de una zona (tarjeta)', () => {
  beforeEach(() => {
    localStorage.clear();
    support.supported = true;
    setOfflineStorage({ store: createMemoryStore(), tiles: createMemoryTileCache() });
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    setOfflineStorage();
  });

  it('ofrece descargar la zona y dice cuánto ocupará', async () => {
    renderCard();
    expect(await screen.findByRole('button', { name: 'Descargar zona' })).toBeEnabled();
    expect(screen.getByText(/Se guardan el mapa, las plantas y la ficha del parque \(unos [\d.,]+ (KB|MB)\)/)).toBeInTheDocument();
  });

  it('descarga, enseña que está disponible sin conexión y permite eliminarla', async () => {
    stubNetwork(tileOk);
    const user = userEvent.setup();
    renderCard();
    await user.click(await screen.findByRole('button', { name: 'Descargar zona' }));

    expect(await screen.findByText('Zona disponible sin conexión')).toBeInTheDocument();
    expect(screen.getByText(/2 ejemplares/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Eliminar descarga' }));
    expect(await screen.findByRole('button', { name: 'Descargar zona' })).toBeInTheDocument();
  });

  it('al volver a la pantalla recuerda que la zona ya estaba descargada', async () => {
    stubNetwork(tileOk);
    const user = userEvent.setup();
    const first = renderCard();
    await user.click(await screen.findByRole('button', { name: 'Descargar zona' }));
    await screen.findByText('Zona disponible sin conexión');
    first.unmount();

    renderCard();
    expect(await screen.findByText('Zona disponible sin conexión')).toBeInTheDocument();
  });

  it('muestra una barra de progreso accesible y permite cancelar sin guardar nada', async () => {
    stubNetwork((signal) => new Promise<Response>((_resolve, reject) => {
      signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
    }));
    const user = userEvent.setup();
    renderCard();
    await user.click(await screen.findByRole('button', { name: 'Descargar zona' }));

    const bar = await screen.findByRole('progressbar', { name: 'Progreso de la descarga' });
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
    expect(Number(bar.getAttribute('aria-valuenow'))).toBeGreaterThan(0);
    expect(screen.getByText('Descargando mapa…')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancelar descarga' }));
    expect(await screen.findByRole('button', { name: 'Descargar zona' })).toBeInTheDocument();
    expect(screen.queryByText('Zona disponible sin conexión')).not.toBeInTheDocument();
  });

  it('si la descarga falla lo dice y deja reintentar', async () => {
    stubNetwork(async () => { throw new TypeError('Failed to fetch'); });
    const user = userEvent.setup();
    renderCard();
    await user.click(await screen.findByRole('button', { name: 'Descargar zona' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No se ha podido descargar la zona');
    expect(screen.getByRole('button', { name: 'Descargar zona' })).toBeEnabled();

    stubNetwork(tileOk);
    await user.click(screen.getByRole('button', { name: 'Descargar zona' }));
    await waitFor(() => expect(screen.getByText('Zona disponible sin conexión')).toBeInTheDocument());
  });

  it('al terminar avisa con onSaved y en la ficha enlaza con Rutas', async () => {
    stubNetwork(tileOk);
    const onSaved = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<OfflineZoneCard groupSlug="jardin-de-las-hesperides" bbox={hesperidesDetail.bbox} onSaved={onSaved} />);
    await user.click(await screen.findByRole('button', { name: 'Descargar zona' }));
    expect(await screen.findByRole('link', { name: 'Ver en Rutas' })).toHaveAttribute('href', '/rutas');
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(onSaved.mock.calls[0]![0]).toMatchObject({ groupSlug: 'jardin-de-las-hesperides', name: 'Jardín de las Hespérides' });
  });

  it('sobre el mapa se puede cerrar y, una vez descargada, no deja nada en pantalla', async () => {
    stubNetwork(tileOk);
    const onClose = vi.fn();
    const user = userEvent.setup();
    const { container } = renderWithProviders(
      <OfflineZoneCard groupSlug="jardin-de-las-hesperides" bbox={hesperidesDetail.bbox} floating onClose={onClose} />,
    );
    await user.click(await screen.findByRole('button', { name: 'Cerrar' }));
    expect(onClose).toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: /Descargar zona/ }));
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it('en un navegador sin IndexedDB lo explica en lugar de fallar', async () => {
    support.supported = false;
    renderCard();
    expect(await screen.findByText('Este navegador no permite guardar zonas para usarlas sin conexión.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Descargar zona' })).not.toBeInTheDocument();
  });

  it('sobre el mapa no ocupa sitio si el navegador no puede guardar zonas', () => {
    support.supported = false;
    const { container } = renderWithProviders(
      <OfflineZoneCard groupSlug="jardin-de-las-hesperides" bbox={hesperidesDetail.bbox} floating />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('una zona enorme no se ofrece: dice que es demasiado grande', async () => {
    renderWithProviders(<OfflineZoneCard groupSlug="espana" bbox={[-9, 36, 3, 43]} />);
    expect(await screen.findByText('Esta zona es demasiado grande para descargarla entera.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Descargar zona' })).not.toBeInTheDocument();
  });
});
