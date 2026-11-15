import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { articleSummaries, hesperidesArticle, stubApi } from '../../test/greenAreaFixtures';
import { renderWithProviders } from '../../test/renderWithProviders';
import { ArticlePage } from './ArticlePage';
import { Discover } from './Discover';

afterEach(() => vi.unstubAllGlobals());

describe('Descubre València: secciones temáticas (NM-08)', () => {
  it('agrupa los artículos por sección y cada uno enlaza a su página', async () => {
    stubApi({ '/editorial': { returned: 3, articles: articleSummaries } }, vi);
    renderWithProviders(<Discover />, { route: '/descubre' });
    const flora = await screen.findByRole('region', { name: 'Flora' });
    expect(within(flora).getByRole('link', { name: /Flora característica de València/ })).toHaveAttribute(
      'href', '/descubre/flora-caracteristica-de-valencia');
    expect(screen.getByRole('region', { name: 'Parques' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Jardines' })).toBeInTheDocument();
    // Sin artículos de paisajismo no se pinta una sección vacía.
    expect(screen.queryByRole('region', { name: 'Paisajismo' })).not.toBeInTheDocument();
  });

  it('abre directamente la sección pedida con ?tema= y permite cambiarla', async () => {
    stubApi({ '/editorial': { returned: 3, articles: articleSummaries } }, vi);
    renderWithProviders(<Discover />, { route: '/descubre?tema=flora' });
    await screen.findByRole('region', { name: 'Flora' });
    expect(screen.queryByRole('region', { name: 'Jardines' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Flora' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Jardines' }));
    expect(await screen.findByRole('region', { name: 'Jardines' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Flora' })).not.toBeInTheDocument();
  });

  it('con ?zona= pide solo los artículos de esa zona verde y lo indica', async () => {
    const fetchMock = stubApi({ '/editorial': { returned: 1, articles: [articleSummaries[2]] } }, vi);
    renderWithProviders(<Discover />, { route: '/descubre?zona=jardin-de-las-hesperides' });
    expect(await screen.findByText('Artículos sobre esta zona verde')).toBeInTheDocument();
    expect(String(fetchMock.mock.calls[0]![0])).toContain('group=jardin-de-las-hesperides');
    await userEvent.click(screen.getByRole('button', { name: 'Ver todos' }));
    expect(String(fetchMock.mock.calls.at(-1)![0])).not.toContain('group=');
  });

  it('ignora un ?zona= con formato no válido', async () => {
    const fetchMock = stubApi({ '/editorial': { returned: 0, articles: [] } }, vi);
    renderWithProviders(<Discover />, { route: '/descubre?zona=../x' });
    expect(await screen.findByText('Aún no hay artículos')).toBeInTheDocument();
    expect(String(fetchMock.mock.calls[0]![0])).not.toContain('group=');
  });

  it('dice el error y deja reintentar', async () => {
    stubApi({}, vi);
    renderWithProviders(<Discover />, { route: '/descubre' });
    expect(await screen.findByRole('alert')).toHaveTextContent('No se han podido cargar los artículos.');
    stubApi({ '/editorial': { returned: 3, articles: articleSummaries } }, vi);
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByRole('region', { name: 'Flora' })).toBeInTheDocument();
  });
});

describe('artículo editorial (NM-08)', () => {
  const renderArticle = () =>
    renderWithProviders(
      <Routes><Route path="/descubre/:slug" element={<ArticlePage />} /></Routes>,
      { route: '/descubre/jardin-de-las-hesperides' },
    );

  it('muestra el texto, las fuentes y el enlace a la zona verde', async () => {
    stubApi({ '/editorial/jardin-de-las-hesperides': hesperidesArticle }, vi);
    renderArticle();
    expect(await screen.findByRole('heading', { level: 1, name: 'Jardín de las Hespérides' })).toBeInTheDocument();
    expect(screen.getByText('Primer párrafo sobre los cítricos.')).toBeInTheDocument();
    expect(screen.getByText('Segundo párrafo sobre el mito.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ver esta zona verde/ })).toHaveAttribute('href', '/zona/jardin-de-las-hesperides');
    const source = screen.getByRole('link', { name: /Vía Arquitectura/ });
    expect(source).toHaveAttribute('href', 'https://via-arquitectura.net/02_prem/02p-064.htm');
    expect(source).toHaveAttribute('rel', 'noreferrer');
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
  });

  it('un artículo temático no enlaza ninguna zona', async () => {
    stubApi({ '/editorial/': { ...hesperidesArticle, greenAreaGroup: null } }, vi);
    renderArticle();
    await screen.findByText('Primer párrafo sobre los cítricos.');
    expect(screen.queryByRole('link', { name: /Ver esta zona verde/ })).not.toBeInTheDocument();
  });

  it('dice el error y deja reintentar', async () => {
    stubApi({}, vi);
    renderArticle();
    expect(await screen.findByRole('alert')).toHaveTextContent('No se ha podido cargar el artículo.');
  });
});
