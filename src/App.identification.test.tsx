import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { renderWithProviders } from './test/renderWithProviders';

vi.mock('./pages/Map', () => ({ MapPage: () => null }));

const photoData = 'data:image/jpeg;base64,Zm90by1kZS1wcnVlYmE=';
const responseOptions = { headers: { 'content-type': 'application/json' } };
const result = (remaining = 42) => ({
  bestMatch: 'Papaver rhoeas',
  remainingIdentificationRequests: remaining,
  results: [{ score: 0.9, scientificName: 'Papaver rhoeas', author: null, family: null,
    genus: null, commonNames: ['Amapola'], gbifId: null }],
});

describe('UT 932 — PA 653–657 en la aplicación', () => {
  let reply: () => Promise<Response>;
  let sentPhotos: File[];

  beforeEach(() => {
    localStorage.clear();
    sentPhotos = [];
    reply = async () => new Response(JSON.stringify(result()), responseOptions);
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).includes('/plants/identify')) {
        if (!(init?.body instanceof FormData)) throw new Error('Expected photo form data');
        sentPhotos.push(init.body.get('images') as File);
        return reply();
      }
      return new Response(JSON.stringify({ total: 0, species: [] }), responseOptions);
    }));
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  async function identifyPhoto() {
    const view = renderWithProviders(<App />, { route: '/escanear' });
    await screen.findByRole('button', { name: /elegir de la galería/i });
    const input = view.container.querySelector<HTMLInputElement>('input[type="file"]');
    if (!input) throw new Error('Gallery input missing');
    fireEvent.change(input, { target: { files: [new File(['foto-de-prueba'], 'planta.jpg', { type: 'image/jpeg' })] } });
    fireEvent.click(await screen.findByRole('button', { name: 'Identificar foto' }));
  }

  it('PA 653 y 657: avisa sin red y reenvía la misma foto al recuperar la conexión', async () => {
    const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    reply = async () => { throw new TypeError('Failed to fetch'); };
    await identifyPhoto();

    expect(await screen.findByRole('heading', { name: 'Sin conexión a Internet' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Foto de la planta' })).toHaveAttribute('src', photoData);
    expect(sentPhotos).toHaveLength(1);

    online.mockReturnValue(true);
    reply = async () => new Response(JSON.stringify(result()), responseOptions);
    const retry = screen.getByRole('button', { name: 'Reintentar identificación' });
    retry.focus();
    await userEvent.keyboard('{Enter}');

    expect(await screen.findByRole('heading', { name: 'Especie más probable' })).toBeInTheDocument();
    expect(screen.queryByText('Sin conexión a Internet')).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Foto escaneada de la planta' })).toHaveAttribute('src', photoData);
    expect(sentPhotos).toHaveLength(2);
    expect(sentPhotos[0].size).toBe(sentPhotos[1].size);
    expect(sentPhotos[0].name).toBe(sentPhotos[1].name);
  });

  it.each([42, 0])('PA 654 y 656: una respuesta correcta con %i restantes no muestra avisos', async remaining => {
    reply = async () => new Response(JSON.stringify(result(remaining)), responseOptions);
    await identifyPhoto();

    expect(await screen.findByRole('heading', { name: 'Especie más probable' })).toBeInTheDocument();
    expect(screen.queryByText('Sin conexión a Internet')).not.toBeInTheDocument();
    expect(screen.queryByText('Límite diario alcanzado')).not.toBeInTheDocument();
    expect(sentPhotos).toHaveLength(1);
  });

  it('PA 655: HTTP 429 avisa del límite, conserva la foto y permite otro intento', async () => {
    reply = async () => new Response(JSON.stringify({ error: 'SERVER_INTERNAL_DETAIL' }), { status: 429, ...responseOptions });
    await identifyPhoto();

    expect(await screen.findByRole('heading', { name: 'Límite diario alcanzado' })).toBeInTheDocument();
    expect(screen.getByText(/500 identificaciones al día/)).toBeInTheDocument();
    expect(screen.queryByText(/SERVER_INTERNAL_DETAIL/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await waitFor(() => expect(sentPhotos).toHaveLength(2));
    expect(await screen.findByRole('heading', { name: 'Límite diario alcanzado' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Vista previa de la foto capturada' })).toHaveAttribute('src', photoData);

    reply = async () => new Response(JSON.stringify(result()), responseOptions);
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByRole('heading', { name: 'Especie más probable' })).toBeInTheDocument();
    expect(screen.queryByText('Límite diario alcanzado')).not.toBeInTheDocument();
  });

  it('no conserva el aviso ni permite duplicar el envío mientras se reintenta', async () => {
    reply = async () => new Response('', { status: 429 });
    await identifyPhoto();
    await screen.findByRole('heading', { name: 'Límite diario alcanzado' });

    let resolveRetry: (response: Response) => void = () => {};
    reply = () => new Promise(resolve => { resolveRetry = resolve; });
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(screen.queryByText('Límite diario alcanzado')).not.toBeInTheDocument();
    const identify = screen.getByRole('button', { name: 'Identificando foto' });
    expect(identify).toBeDisabled();
    fireEvent.click(identify);
    expect(sentPhotos).toHaveLength(2);

    resolveRetry(new Response(JSON.stringify(result()), responseOptions));
    expect(await screen.findByRole('heading', { name: 'Especie más probable' })).toBeInTheDocument();
  });

  it('un fallo de Pl@ntNet HTTP 504 se puede reintentar sin inventar falta de Internet', async () => {
    reply = async () => new Response('', { status: 504 });
    await identifyPhoto();
    expect(await screen.findByRole('heading', { name: 'Servicio de identificación no disponible' })).toBeInTheDocument();
    expect(screen.queryByText('Sin conexión a Internet')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeEnabled();
  });
});
