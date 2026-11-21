import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { hesperides, stubApi } from '../../test/greenAreaFixtures';
import { renderWithProviders } from '../../test/renderWithProviders';
import { GreenAreaContext } from './GreenAreaContext';

afterEach(() => vi.unstubAllGlobals());

describe('entorno verde de un punto de interés (NM-08, PA 3012)', () => {
  it('enlaza la zona verde en la que está el punto', async () => {
    const fetchMock = stubApi({ '/green-areas/at': { relation: 'inside', distance: 0, area: hesperides } }, vi);
    const onOpen = vi.fn();
    renderWithProviders(<GreenAreaContext latitude={39.4775} longitude={-0.3882} onOpen={onOpen} />);
    const link = await screen.findByRole('link', { name: /Está dentro de Jardín de las Hespérides/ });
    expect(link).toHaveAttribute('href', '/zona/jardin-de-las-hesperides');
    expect(screen.getByRole('heading', { name: 'Entorno verde' })).toBeInTheDocument();
    expect(String(fetchMock.mock.calls[0]![0])).toContain('lat=39.4775&lon=-0.3882');
    await userEvent.click(link);
    expect(onOpen).toHaveBeenCalledOnce();
  });

  it('si el punto está fuera, ofrece el parque más cercano con su distancia', async () => {
    stubApi({ '/green-areas/at': { relation: 'near', distance: 45, area: hesperides } }, vi);
    renderWithProviders(<GreenAreaContext latitude={39.4765} longitude={-0.3855} />);
    expect(await screen.findByRole('link', { name: /A 45 m de Jardín de las Hespérides/ })).toBeInTheDocument();
  });

  it('sin zona verde cerca no pinta una sección vacía', async () => {
    const fetchMock = stubApi({ '/green-areas/at': { relation: null, distance: null, area: null } }, vi);
    const { container } = renderWithProviders(<GreenAreaContext latitude={39.45} longitude={-0.35} />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it('un fallo de red no rompe la ficha que lo contiene', async () => {
    const fetchMock = stubApi({ '/green-areas/at': new Error('sin red') }, vi);
    const { container } = renderWithProviders(<GreenAreaContext latitude={39.45} longitude={-0.35} />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});
