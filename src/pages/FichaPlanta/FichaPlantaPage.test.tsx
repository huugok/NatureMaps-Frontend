import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { DEMO_SPECIES } from './constants';
import { FichaPlantaPage } from './FichaPlantaPage';

const renderFicha = (props: React.ComponentProps<typeof FichaPlantaPage> = {}) =>
  render(<FichaPlantaPage {...props} />);

describe('FichaPlantaPage', () => {
  it('muestra la foto, el nombre común y el científico y la familia', () => {
    renderFicha();

    expect(
      screen.getByRole('heading', { level: 1, name: 'Jacaranda mimosifolia' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Jacaranda')).toBeInTheDocument();
    expect(screen.getByText('Familia Bignoniaceae')).toBeInTheDocument();
  });

  it('muestra la descripción breve', () => {
    renderFicha();

    expect(screen.getByRole('heading', { name: 'Descripción' })).toBeInTheDocument();
    expect(screen.getByText(/Árbol subtropical oriundo de Sudamérica/)).toBeInTheDocument();
  });

  it('muestra la familia, la floración y el lugar donde está la especie', () => {
    renderFicha();

    expect(screen.getByText('Floración: primavera')).toBeInTheDocument();
    expect(screen.getByText('Vara de Quart')).toBeInTheDocument();
  });

  it('muestra la curiosidad de la especie', () => {
    renderFicha();

    expect(screen.getByText('Dato curioso:')).toBeInTheDocument();
    expect(screen.getByText(/aplauso de mono/)).toBeInTheDocument();
  });

  it('avisa del servicio de identificación con su enlace', () => {
    renderFicha();

    expect(screen.getByText(/se basa en una API de reconocimiento de Plantnet/)).toBeInTheDocument();

    const links = screen.getAllByRole('link', { name: 'https://my.plantnet.org' });
    expect(links.length).toBeGreaterThan(0);
    links.forEach((link) => {
      expect(link).toHaveAttribute('href', 'https://my.plantnet.org');
    });
  });

  it('lista las fuentes de información con su número', () => {
    renderFicha();

    expect(screen.getByRole('heading', { name: 'Fuentes de información' })).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Wikipedia (es)')).toBeInTheDocument();
    expect(screen.getByText('Wikimedia Commons')).toBeInTheDocument();
    expect(screen.getByText('Ajuntament de València')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'https://geoportal.valencia.es/server/rest/services/OPENDATA/MedioAmbiente/MapServer/151/query' }),
    ).toBeInTheDocument();
  });

  it('el botón "Ver en el mapa" avisa', () => {
    const onViewOnMap = vi.fn();
    renderFicha({ onViewOnMap });

    fireEvent.click(screen.getByRole('button', { name: /ver en el mapa/i }));

    expect(onViewOnMap).toHaveBeenCalledTimes(1);
  });

  it('el botón de volver avisa', () => {
    const onBack = vi.fn();
    renderFicha({ onBack });

    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('el botón de favoritos alterna entre guardar y quitar', () => {
    const onToggleFavorite = vi.fn();
    renderFicha({ onToggleFavorite });

    const favoriteButton = screen.getByRole('button', { name: 'Guardar en favoritos' });
    expect(favoriteButton).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(favoriteButton);

    const unfavoriteButton = screen.getByRole('button', { name: 'Quitar de favoritos' });
    expect(unfavoriteButton).toHaveAttribute('aria-pressed', 'true');
    expect(onToggleFavorite).toHaveBeenCalledTimes(1);
  });
});

describe('FichaPlantaPage — especie por props (PA 1250 y PA 692)', () => {
  it('pinta la especie que recibe, no siempre la de ejemplo', () => {
    render(<FichaPlantaPage species={DEMO_SPECIES[1]} />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Citrus × aurantium' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Naranjo amargo')).toBeInTheDocument();
  });

  it('muestra la confianza cuando la ficha viene de una identificación', () => {
    render(<FichaPlantaPage species={DEMO_SPECIES[0]} identification={{ score: 0.83 }} />);

    expect(screen.getByText('Identificada con 83% de confianza')).toBeInTheDocument();
  });

  it('con una especie genérica usa la foto capturada y no inventa secciones', () => {
    render(
      <FichaPlantaPage
        species={{
          commonName: 'Rosal silvestre',
          scientificName: 'Rosa canina',
          family: 'Rosaceae',
          photoUrl: 'data:image/jpeg;base64,abc',
          sources: [
            {
              name: 'Pl@ntNet',
              description: 'Identificación por imagen',
              url: 'https://my.plantnet.org',
              icon: 'search',
            },
          ],
        }}
        identification={{ score: 0.46 }}
      />,
    );

    expect(screen.getByRole('img', { name: /Rosal silvestre/ })).toBeInTheDocument();
    expect(screen.getByText('Identificada con 46% de confianza')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Descripción' })).not.toBeInTheDocument();
    expect(screen.queryByText(/Dato curioso/)).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Fuentes de información' })).toBeInTheDocument();
    expect(screen.getByText('Pl@ntNet')).toBeInTheDocument();
  });

  it('sin foto ni fuentes deja el marcador y oculta el bloque de fuentes', () => {
    render(<FichaPlantaPage species={{ commonName: 'Rosal', scientificName: 'Rosa sp.' }} />);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Fuentes de información' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Descripción' })).not.toBeInTheDocument();
  });
});
