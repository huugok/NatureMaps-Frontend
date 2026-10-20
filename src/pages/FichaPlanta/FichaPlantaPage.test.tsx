import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
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
    expect(screen.getByText(/Árbol ornamental de gran porte/)).toBeInTheDocument();
  });

  it('muestra la familia, la floración y el lugar donde está la especie', () => {
    renderFicha();

    expect(screen.getByText('Floración: abr-jun')).toBeInTheDocument();
    expect(screen.getByText('Parc Central')).toBeInTheDocument();
  });

  it('muestra la curiosidad de la especie', () => {
    renderFicha();

    expect(screen.getByText('Dato curioso:')).toBeInTheDocument();
    expect(screen.getByText(/todo un símbolo de Valencia/)).toBeInTheDocument();
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
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Pl@ntNet (CIRAD, INRAE, INRIA, IRD)')).toBeInTheDocument();
    expect(screen.getByText('Ajuntament de València')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'https://www.valencia.es' })).toBeInTheDocument();
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
