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
      photo="data:image/jpeg;base64,foto"
      onRetry={vi.fn()}
      onBack={vi.fn()}
      onRepeatPhoto={vi.fn()}
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

  it('muestra la especie más probable y las alternativas ordenadas con su porcentaje', () => {
    renderResultado();

    expect(screen.getByText('Especie más probable')).toBeInTheDocument();
    expect(screen.getByText('Ficus benjamina')).toBeInTheDocument();
    expect(screen.getByText('42%')).toBeInTheDocument();

    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(2);
    expect(radios[0]).toHaveAccessibleName(/Jacaranda/);
    expect(radios[1]).toHaveAccessibleName(/Aligustre/);
    expect(screen.getByText('31%')).toBeInTheDocument();
    expect(screen.getByText('12%')).toBeInTheDocument();
  });

  it('el usuario puede elegir una especie alternativa y se confirma', async () => {
    renderResultado();

    await userEvent.click(screen.getByRole('radio', { name: /Jacaranda/ }));

    expect(screen.getByRole('radio', { name: /Jacaranda/ })).toBeChecked();
    expect(screen.getByText(/Especie elegida: Jacaranda mimosifolia/)).toBeInTheDocument();
  });

  it('descarta la especie elegida cuando llega una identificación nueva', async () => {
    const { rerender } = renderResultado();

    await userEvent.click(screen.getByRole('radio', { name: /Jacaranda/ }));
    expect(screen.getByText(/Especie elegida: Jacaranda mimosifolia/)).toBeInTheDocument();

    rerender(
      <CameraIdentificationResult
        status="completed"
        mode="planta"
        results={resultado([
          { score: 0.2, scientificName: 'Tipuana tipu', author: null, family: null, genus: null, commonNames: [], gbifId: null },
        ])}
        error={null}
        photo={null}
        onRetry={vi.fn()}
        onBack={vi.fn()}
        onRepeatPhoto={vi.fn()}
      />,
    );

    expect(screen.queryByText(/Especie elegida/)).not.toBeInTheDocument();
  });

  it('con confianza suficiente también ofrece las otras posibles', () => {
    renderResultado({ results: clara });

    expect(screen.getByText('Papaver rhoeas')).toBeInTheDocument();
    expect(screen.getByText('Certeza alta')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Papaver dubium/ })).toBeInTheDocument();
  });

  it('«Ver ficha» abre la especie más probable', async () => {
    const onOpenSpecies = vi.fn();
    renderResultado({ results: clara, onOpenSpecies });

    await userEvent.click(screen.getByRole('button', { name: 'Ver ficha' }));

    expect(onOpenSpecies).toHaveBeenCalledTimes(1);
    expect(onOpenSpecies).toHaveBeenCalledWith(
      expect.objectContaining({ scientificName: 'Papaver rhoeas' }),
    );
  });

  it('el botón de volver y el de repetir foto avisan', async () => {
    const onBack = vi.fn();
    const onRepeatPhoto = vi.fn();
    renderResultado({ onBack, onRepeatPhoto });

    await userEvent.click(screen.getByRole('button', { name: 'Volver' }));
    await userEvent.click(screen.getByRole('button', { name: /repetir foto/i }));

    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onRepeatPhoto).toHaveBeenCalledTimes(1);
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

  it('no muestra el error de identificación en modo monumento', () => {
    renderResultado({ status: 'error', results: null, mode: 'monumento' });

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
