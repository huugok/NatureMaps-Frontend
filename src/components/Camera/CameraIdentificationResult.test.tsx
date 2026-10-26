import { describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import type { PlantIdentification } from '../../types/identify';
import { CameraIdentificationResult } from './CameraIdentificationResult';

const resultado = (
  resultados: PlantIdentification['results'],
): PlantIdentification => ({
  bestMatch: resultados[0]?.scientificName ?? null,
  remainingIdentificationRequests: 10,
  results: resultados,
});

const bajaConfianza = resultado([
  { score: 0.31, scientificName: 'Jacaranda mimosifolia', author: null, family: null, genus: null, commonNames: ['Jacaranda'], gbifId: null },
  { score: 0.42, scientificName: 'Ficus benjamina', author: null, family: null, genus: null, commonNames: ['Ficus'], gbifId: null },
  { score: 0.12, scientificName: 'Ligustrum lucidum', author: null, family: null, genus: null, commonNames: ['Aligustre'], gbifId: null },
]);

const clara = resultado([
  { score: 0.86, scientificName: 'Papaver rhoeas', author: 'L.', family: null, genus: null, commonNames: ['Amapola'], gbifId: null },
  { score: 0.1, scientificName: 'Papaver dubium', author: 'L.', family: null, genus: null, commonNames: [], gbifId: null },
]);

const renderResultado = (
  props: Partial<ComponentProps<typeof CameraIdentificationResult>> = {},
) =>
  render(
    <CameraIdentificationResult
      status="completed"
      mode="planta"
      results={bajaConfianza}
      error={null}
      onRetry={vi.fn()}
      onOpenSpecies={vi.fn()}
      {...props}
    />,
  );

describe('CameraIdentificationResult — UT F05 (PA 689) en el escaneo con cámara', () => {
  it('no pinta nada mientras no hay identificación en marcha', () => {
    const { container } = renderResultado({ status: 'idle', results: null });

    expect(container).toBeEmptyDOMElement();
  });

  it('avisa de que la foto se está enviando', () => {
    renderResultado({ status: 'identifying', results: null });

    expect(screen.getByRole('status')).toHaveTextContent(/enviando la foto a pl@ntnet/i);
  });

  it('con confianza baja muestra las alternativas ordenadas y con su porcentaje', () => {
    renderResultado();

    expect(screen.getByRole('heading', { name: 'Especies alternativas' })).toBeInTheDocument();
    expect(screen.getByText(/la confianza de la mejor coincidencia es baja/i)).toBeInTheDocument();

    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(3);
    expect(radios[0]).toHaveAccessibleName(/Ficus/);
    expect(radios[1]).toHaveAccessibleName(/Jacaranda/);
    expect(radios[2]).toHaveAccessibleName(/Aligustre/);
    expect(screen.getByText('42% de confianza')).toBeInTheDocument();
  });

  it('el usuario puede elegir una especie y se confirma', async () => {
    renderResultado();

    await userEvent.click(screen.getByRole('radio', { name: /Jacaranda/ }));

    expect(screen.getByRole('radio', { name: /Jacaranda/ })).toBeChecked();
    expect(screen.getByText(/Especie elegida: Jacaranda mimosifolia/)).toBeInTheDocument();
  });

  it('descarta la especie elegida cuando llega una identificación nueva', async () => {
    const { rerender } = renderResultado();

    await userEvent.click(screen.getByRole('radio', { name: /Ficus/ }));
    expect(screen.getByText(/Especie elegida: Ficus benjamina/)).toBeInTheDocument();

    rerender(
      <CameraIdentificationResult
        status="completed"
        mode="planta"
        results={resultado([
          { score: 0.2, scientificName: 'Tipuana tipu', author: null, family: null, genus: null, commonNames: [], gbifId: null },
        ])}
        error={null}
        onRetry={vi.fn()}
        onOpenSpecies={vi.fn()}
      />,
    );

    expect(screen.queryByText(/Especie elegida/)).not.toBeInTheDocument();
  });

  it('con confianza suficiente muestra las fichas de las candidatas, sin aviso de confianza baja', () => {
    renderResultado({ results: clara });

    expect(screen.getByRole('heading', { name: 'Especies candidatas' })).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(2);
    expect(screen.getByRole('radio', { name: /Amapola/ })).toBeInTheDocument();
    expect(
      screen.queryByText(/la confianza de la mejor coincidencia es baja/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Especies alternativas' }),
    ).not.toBeInTheDocument();
  });

  it('avisa cuando Pl@ntNet no devuelve candidatas', () => {
    renderResultado({ results: resultado([]) });

    expect(screen.getByRole('status')).toHaveTextContent(/no ha encontrado candidatas/i);
  });

  it('comunica el error y permite reintentar en modo planta', async () => {
    const onRetry = vi.fn();
    renderResultado({ status: 'error', results: null, error: 'Sin conexión', onRetry });

    expect(screen.getByRole('alert')).toHaveTextContent(/no se ha podido identificar/i);
    expect(screen.getByText('Sin conexión')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('PA 1250: el botón «Ver ficha» abre la especie del resultado principal', async () => {
    const onOpenSpecies = vi.fn();
    renderResultado({ results: clara, onOpenSpecies });

    await userEvent.click(screen.getByRole('button', { name: 'Ver ficha' }));

    expect(onOpenSpecies).toHaveBeenCalledTimes(1);
    expect(onOpenSpecies).toHaveBeenCalledWith(
      expect.objectContaining({ scientificName: 'Papaver rhoeas' }),
    );
  });

  it('PA 692: tocar una alternativa abre la ficha de esa especie', async () => {
    const onOpenSpecies = vi.fn();
    renderResultado({ onOpenSpecies });

    await userEvent.click(screen.getByRole('radio', { name: /Jacaranda/ }));

    expect(onOpenSpecies).toHaveBeenCalledTimes(1);
    expect(onOpenSpecies).toHaveBeenCalledWith(
      expect.objectContaining({ scientificName: 'Jacaranda mimosifolia' }),
    );
  });

  it('no muestra el error de identificación en modo monumento', () => {
    renderResultado({ status: 'error', results: null, mode: 'monumento' });

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
