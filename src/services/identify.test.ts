import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { identifyPlant } from './identify';

// Respuesta tal y como la devuelve el backend (ya normalizada):
// la traducción del JSON de Pl@ntNet ocurre en el servidor.
const respuestaBackend = {
  bestMatch: 'Papaver rhoeas',
  remainingIdentificationRequests: 42,
  results: [
    {
      score: 0.75,
      scientificName: 'Papaver rhoeas',
      author: 'L.',
      family: 'Papaveraceae',
      genus: 'Papaver',
      commonNames: ['Amapola'],
      gbifId: '2876818',
    },
  ],
};

const respuestaJson = { headers: { 'content-type': 'application/json' } };
// Cada llamada debe tener su propia Response: el body de una Response se consume una sola vez.
const respuestaOk = () => new Response(JSON.stringify(respuestaBackend), respuestaJson);

describe('identifyPlant — UT F04: envío de foto a Pl@ntNet', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('PA 658: envía la foto en multipart al backend y devuelve las especies con su puntuación', async () => {
    const fetchMock = vi.fn().mockImplementation(respuestaOk);
    vi.stubGlobal('fetch', fetchMock);

    const image = new Blob(['foto'], { type: 'image/jpeg' });
    const result = await identifyPlant(image, 'amapola.jpg');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const llamada = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const [url, init] = llamada;
    expect(url).toBe('http://localhost:3000/plants/identify');
    expect(init.method).toBe('POST');
    const body = init.body as FormData;
    expect(body.get('images')).toBeInstanceOf(Blob);
    expect(result.bestMatch).toBe('Papaver rhoeas');
    expect(result.results).toHaveLength(1);
    expect(result.results[0]).toMatchObject({ score: 0.75, scientificName: 'Papaver rhoeas', gbifId: '2876818' });
  });

  test('PA 659: cada envío es independiente, se puede identificar otra foto a continuación', async () => {
    const fetchMock = vi.fn().mockImplementation(respuestaOk);
    vi.stubGlobal('fetch', fetchMock);

    await identifyPlant(new Blob(['a'], { type: 'image/jpeg' }), 'uno.jpg');
    await identifyPlant(new Blob(['b'], { type: 'image/png' }), 'dos.png');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const primera = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const segunda = fetchMock.mock.calls[1] as unknown as [string, RequestInit];
    const primerBody = primera[1].body as FormData;
    const segundoBody = segunda[1].body as FormData;
    expect(primerBody).not.toBe(segundoBody);
    expect((primerBody.get('images') as File).name).toBe('uno.jpg');
    expect((segundoBody.get('images') as File).name).toBe('dos.png');
  });

  test('PA 660: un error del backend se traduce en un Error con el detalle del fallo', async () => {
    const fetchMock = vi.fn().mockImplementation(
      () =>
        new Response(
          JSON.stringify({ error: 'Se ha superado el límite de identificaciones de Pl@ntNet, inténtalo más tarde' }),
          { status: 429, ...respuestaJson },
        ),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(identifyPlant(new Blob(['x']), 'a.jpg')).rejects.toThrow(/límite de identificaciones/);
  });

  test('PA 660: una respuesta sin detalle mantiene el mensaje genérico', async () => {
    const fetchMock = vi.fn().mockImplementation(() => new Response('', { status: 500 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(identifyPlant(new Blob(['x']), 'a.jpg')).rejects.toThrow(
      'No se ha completado la identificación (HTTP 500)',
    );
  });

  test('PA 660: sin conexión el error indica que no se pudo contactar con el servidor', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    vi.stubGlobal('fetch', fetchMock);

    await expect(identifyPlant(new Blob(['x']), 'a.jpg')).rejects.toThrow(
      'No se ha podido contactar con el servidor de identificación',
    );
  });
});
