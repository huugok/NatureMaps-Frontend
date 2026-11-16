import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { hesperidesDetail, stubApi } from '../../test/greenAreaFixtures';
import { renderWithProviders } from '../../test/renderWithProviders';
import { GreenAreaPage } from './GreenAreaPage';

afterEach(() => vi.unstubAllGlobals());

const renderArea = () =>
  renderWithProviders(
    <Routes><Route path="/zona/:grupo" element={<GreenAreaPage />} /></Routes>,
    { route: '/zona/jardin-de-las-hesperides' },
  );

describe('ficha de zona verde (NM-08)', () => {
  it('muestra nombre, superficie y recuentos, y lleva al mapa con la zona resaltada', async () => {
    const fetchMock = stubApi({ '/green-areas/group/': hesperidesDetail }, vi);
    renderArea();
    expect(await screen.findByRole('heading', { level: 1, name: 'Jardín de las Hespérides' })).toBeInTheDocument();
    expect(String(fetchMock.mock.calls[0]![0])).toContain('/green-areas/group/jardin-de-las-hesperides');
    expect(screen.getByText('Parques Urbanos · El Botànic')).toBeInTheDocument();
    expect(screen.getByText('4342 m²')).toBeInTheDocument();
    expect(screen.getByText('1250 ejemplares')).toBeInTheDocument();
    expect(screen.getByText('2 especies')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver en el mapa' })).toHaveAttribute('href', '/mapa?zona=jardin-de-las-hesperides');
  });

  it('enlaza sus artículos, su flora y lista los puntos de interés de dentro', async () => {
    stubApi({ '/green-areas/group/': hesperidesDetail }, vi);
    renderArea();
    const articles = await screen.findByRole('region', { name: 'Para saber más' });
    expect(within(articles).getByRole('link', { name: /Jardín de las Hespérides/ })).toHaveAttribute(
      'href', '/descubre/jardin-de-las-hesperides');
    const flora = screen.getByRole('region', { name: 'Flora más frecuente' });
    expect(within(flora).getByRole('link', { name: /Naranjo amargo/ })).toHaveAttribute('href', '/mapa?verEspecie=7');
    expect(within(flora).getByText('1200 ejemplares')).toBeInTheDocument();
    // Sin nombre común se muestra el científico.
    expect(within(flora).getByRole('link', { name: /Jacaranda mimosifolia/ })).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Puntos de interés dentro' })).getByText('Estatua de Hércules')).toBeInTheDocument();
  });

  it('cita la fuente de los datos y su licencia (RNF6)', async () => {
    stubApi({ '/green-areas/group/': hesperidesDetail }, vi);
    renderArea();
    const source = await screen.findByRole('region', { name: 'Fuente de los datos' });
    expect(within(source).getByRole('link', { name: /Ajuntament de València/ })).toHaveAttribute(
      'href', 'https://geoportal.valencia.es/server/rest/services/OPENDATA/MedioAmbiente/MapServer/8');
    expect(within(source).getByRole('link', { name: 'Licencia: CC BY 4.0' })).toHaveAttribute(
      'href', 'https://creativecommons.org/licenses/by/4.0/');
  });

  it('una zona sin arbolado inventariado lo dice en lugar de callarlo', async () => {
    stubApi({ '/green-areas/group/': { ...hesperidesDetail, plants: { total: 0, species: 0 }, topSpecies: [], pois: [], articles: [] } }, vi);
    renderArea();
    expect(await screen.findByRole('note')).toHaveTextContent('El inventario no tiene ejemplares registrados dentro de esta zona.');
    expect(screen.queryByRole('region', { name: 'Para saber más' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Puntos de interés dentro' })).not.toBeInTheDocument();
  });

  it('dice el error si la zona no existe o falla la red', async () => {
    stubApi({}, vi);
    renderArea();
    expect(await screen.findByRole('alert')).toHaveTextContent('No se ha podido cargar la zona verde.');
  });
});
