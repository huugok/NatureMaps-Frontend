import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../test/renderWithProviders';
import { savedRoute } from '../../test/routeOfflineFixtures';
import { createMemoryRouteStore, setOfflineRouteStore } from '../../services/offlineRouteStorage';
import { downloadRoute } from '../../services/offlineRouteDownload';
import { OfflineRouteCard } from './OfflineRouteCard';
import { DownloadedRoutes } from './DownloadedRoutes';

vi.mock('../../services/offlineRouteDownload', () => ({ downloadRoute: vi.fn() }));
vi.mock('../../services/offlineRouteStorage', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../services/offlineRouteStorage')>(), supportsOfflineRoutes: () => true,
}));

beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); setOfflineRouteStore(createMemoryRouteStore()); });
afterEach(() => setOfflineRouteStore());

describe('controles de descarga de ruta', () => {
  it('muestra progreso accesible y permite cancelar la petición en curso', async () => {
    const user = userEvent.setup();
    vi.mocked(downloadRoute).mockImplementation(async ({ signal, onProgress }) => {
      onProgress?.({ phase: 'images', fraction: 0.4, done: 1, total: 3 });
      return new Promise((_resolve, reject) => { signal!.addEventListener('abort', () => reject(signal!.reason)); });
    });
    renderWithProviders(<OfflineRouteCard routeId={7} />);
    const button = await screen.findByRole('button', { name: 'Descargar ruta' });
    await waitFor(() => expect(button).toBeEnabled());
    await user.click(button);
    expect(screen.getByRole('progressbar')).toHaveAttribute('value', '0.4');
    await user.click(screen.getByRole('button', { name: 'Cancelar descarga' }));
    await waitFor(() => expect(screen.queryByRole('progressbar')).not.toBeInTheDocument());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('una descarga completa se puede eliminar de la ficha', async () => {
    const user = userEvent.setup();
    vi.mocked(downloadRoute).mockResolvedValue(savedRoute());
    renderWithProviders(<OfflineRouteCard routeId={7} />);
    const button = await screen.findByRole('button', { name: 'Descargar ruta' });
    await waitFor(() => expect(button).toBeEnabled());
    await user.click(button);
    expect(await screen.findByText(/Disponible sin conexión/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Eliminar descarga' }));
    expect(await screen.findByRole('button', { name: 'Descargar ruta' })).toBeInTheDocument();
  });

  it('la lista responde al guardado y al borrado de una ruta', async () => {
    const store = createMemoryRouteStore(); setOfflineRouteStore(store);
    await store.put(savedRoute());
    const user = userEvent.setup();
    renderWithProviders(<DownloadedRoutes />);
    expect(await screen.findByText('Ruta de los jardines')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver ficha' })).toHaveAttribute('href', '/rutas/7');
    await act(async () => { await user.click(screen.getByRole('button', { name: 'Eliminar la descarga de Ruta de los jardines' })); });
    expect(await store.all()).toEqual([]);
    await waitFor(() => expect(screen.queryByText('Ruta de los jardines')).not.toBeInTheDocument());
  });
});
