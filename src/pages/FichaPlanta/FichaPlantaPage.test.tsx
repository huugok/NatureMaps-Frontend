import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { FichaPlantaPage } from './FichaPlantaPage';
import type { EspecieFicha } from '../../services/ficha';

const especie: EspecieFicha = {
  id: 7,
  commonName: 'Jacaranda',
  scientificName: 'Jacaranda mimosifolia',
  family: 'Bignoniaceae',
  photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/b9/Jacaranda1212.jpg',
  photoAlt: 'Fotografía de Jacaranda',
  photoCredit: 'Kahuroa · Wikimedia Commons · dominio público',
  description: 'Árbol subtropical oriundo de Sudamérica —de forma nativa crece en Argentina, Brasil, Bolivia y Paraguay—…',
  flowering: 'primavera',
  curiosity: { label: 'Dato curioso', text: 'su fruto es una cápsula leñosa en forma de castañuela…' },
  sources: [
    { name: 'Wikipedia (es)', description: 'Descripción y datos botánicos (CC BY-SA) · Consulta 25/10/2026', url: 'https://es.wikipedia.org/wiki/Jacaranda_mimosifolia' },
    { name: 'Wikimedia Commons', description: 'Fotografía: "Jacaranda1212.jpg" de Kahuroa · dominio público', url: 'https://commons.wikimedia.org/wiki/File:Jacaranda1212.jpg' },
    { name: 'Ajuntament de València', description: 'Inventario de arbolado municipal · 5.253 ejemplares', url: 'https://geoportal.valencia.es/server/rest/services/OPENDATA/MedioAmbiente/MapServer/151/query' },
  ],
  locations: [{ district: 'Patraix', neighborhood: 'Vara de Quart' }],
  locationTotal: 3,
};

const renderFicha = (overrides: Partial<Parameters<typeof FichaPlantaPage>[0]> = {}) =>
  render(
    <FichaPlantaPage
      species={especie}
      position={0}
      total={6}
      {...overrides}
    />,
  );

describe('FichaPlantaPage conectada a la API (RF3)', () => {
  it('muestra la foto, el nombre común y el científico y la familia', () => {
    renderFicha();

    expect(
      screen.getByRole('heading', { level: 1, name: 'Jacaranda mimosifolia' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Jacaranda')).toBeInTheDocument();
    expect(screen.getByText('Familia Bignoniaceae')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Fotografía de Jacaranda' })).toHaveAttribute(
      'src',
      'https://upload.wikimedia.org/wikipedia/commons/b/b9/Jacaranda1212.jpg',
    );
  });

  it('muestra la atribución de la foto (RNF6: créditos visibles)', () => {
    renderFicha();

    expect(screen.getByText(/Foto: Kahuroa · Wikimedia Commons · dominio público/)).toBeInTheDocument();
  });

  it('muestra la descripción, la floración, el lugar y el recuento de ejemplares', () => {
    renderFicha();

    expect(screen.getByRole('heading', { name: 'Descripción' })).toBeInTheDocument();
    expect(screen.getByText(/Árbol subtropical oriundo de Sudamérica/)).toBeInTheDocument();
    expect(screen.getByText('Floración: primavera')).toBeInTheDocument();
    expect(screen.getByText('Vara de Quart')).toBeInTheDocument();
    expect(screen.getByText('3 ejemplares')).toBeInTheDocument();
  });

  it('muestra la curiosidad y las fuentes con su número', () => {
    renderFicha();

    expect(screen.getByText('Dato curioso:')).toBeInTheDocument();
    expect(screen.getByText(/aplauso de mono|cápsula leñosa/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Fuentes de información' })).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Wikipedia (es)')).toBeInTheDocument();
    expect(screen.getByText('Ajuntament de València')).toBeInTheDocument();
  });

  it('una especie sin foto ni perfil curado sigue siendo una ficha válida', () => {
    renderFicha({
      species: {
        ...especie,
        photoUrl: null,
        photoCredit: null,
        flowering: null,
        curiosity: null,
        sources: [],
        locations: [],
        locationTotal: 0,
      },
    });

    expect(screen.getByRole('heading', { level: 1, name: 'Jacaranda mimosifolia' })).toBeInTheDocument();
    expect(screen.queryByText(/Floración:/)).not.toBeInTheDocument();
    expect(screen.queryByText('Dato curioso:')).not.toBeInTheDocument();
    expect(screen.queryByText(/Foto:/)).not.toBeInTheDocument();
  });

  it('navega con Anterior y Siguiente y muestra la posición', () => {
    const onPrevious = vi.fn();
    const onNext = vi.fn();
    renderFicha({ position: 1, total: 6, onPrevious, onNext });

    expect(screen.getByText('2 / 6')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Especie anterior' }));
    expect(onPrevious).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Especie siguiente' }));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('deshabilita Anterior en la primera especie y Siguiente en la última', () => {
    const { rerender } = render(
      <FichaPlantaPage species={especie} position={0} total={6} onPrevious={undefined} onNext={vi.fn()} />,
    );

    expect(screen.getByRole('button', { name: 'Especie anterior' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Especie siguiente' })).toBeEnabled();

    rerender(
      <FichaPlantaPage species={especie} position={5} total={6} onPrevious={vi.fn()} onNext={undefined} />,
    );

    expect(screen.getByRole('button', { name: 'Especie anterior' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Especie siguiente' })).toBeDisabled();
    expect(screen.getByText('6 / 6')).toBeInTheDocument();
  });

  it('los botones de volver, mapa y favoritos siguen avisando', () => {
    const onBack = vi.fn();
    const onViewOnMap = vi.fn();
    const onToggleFavorite = vi.fn();
    renderFicha({ onBack, onViewOnMap, onToggleFavorite });

    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));
    fireEvent.click(screen.getByRole('button', { name: /ver en el mapa/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar en favoritos' }));

    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onViewOnMap).toHaveBeenCalledTimes(1);
    expect(onToggleFavorite).toHaveBeenCalledTimes(1);
  });
});
