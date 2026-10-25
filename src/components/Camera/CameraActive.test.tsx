import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { CameraActive } from './CameraActive';
import type { PlantIdentification, PlantMatch } from '../../types/identify';

const makeMatch = (scientificName: string, score: number): PlantMatch => ({
  score,
  scientificName,
  author: null,
  family: 'Arecaceae',
  genus: 'Phoenix',
  commonNames: ['Palmera canaria'],
  gbifId: null,
});

const makeResults = (...matches: PlantMatch[]): PlantIdentification => ({
  bestMatch: matches[0]?.scientificName ?? null,
  remainingIdentificationRequests: null,
  results: matches,
});

function renderResults(results: PlantIdentification) {
  render(
    <CameraActive
      mode="planta"
      onModeChange={vi.fn()}
      onClose={vi.fn()}
      onSelectFromGallery={vi.fn()}
      onSavePhoto={vi.fn(() => true)}
      onIdentifyPhoto={vi.fn()}
      identificationStatus="completed"
      identificationResults={results}
      identificationError={null}
    />,
  );

  // La pantalla de resultados se muestra después de capturar una foto.
  fireEvent.click(screen.getByRole('button', { name: 'Hacer foto' }));
}

describe('CameraActive percentage of confidence (UT 937)', () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: vi.fn(),
      fillRect: vi.fn(),
      fillText: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/jpeg;base64,photo');
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('shows the confidence percentage rounded to the nearest integer', () => {
    renderResults(makeResults(makeMatch('Phoenix canariensis', 0.876)));

    expect(screen.getByText('88%')).toBeInTheDocument();
    expect(screen.getByRole('meter', { name: 'Certeza de Phoenix canariensis' }))
      .toHaveAttribute('aria-valuenow', '88');
  });

  it('shows a percentage and confidence meter for every candidate', () => {
    renderResults(makeResults(
      makeMatch('Phoenix canariensis', 0.81),
      makeMatch('Phoenix dactylifera', 0.42),
    ));

    expect(screen.getByText('81%')).toBeInTheDocument();
    expect(screen.getByText('42%')).toBeInTheDocument();
    expect(screen.getByRole('meter', { name: 'Certeza de Phoenix canariensis' }))
      .toHaveAttribute('aria-valuemax', '100');
    expect(screen.getByRole('meter', { name: 'Certeza de Phoenix dactylifera' }))
      .toHaveAttribute('aria-valuenow', '42');
  });

  it.each([
    [0.7, 'Certeza alta'],
    [0.4, 'Certeza media'],
    [0.39, 'Certeza baja'],
  ])('describes score %s as %s', (score, label) => {
    renderResults(makeResults(makeMatch('Phoenix canariensis', score)));

    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('explains when the service returns no candidate species', () => {
    renderResults(makeResults());

    expect(screen.getAllByRole('status').some((status) => status.textContent?.includes(
      'Pl@ntNet no ha encontrado especies candidatas para esta foto.',
    ))).toBe(true);
    expect(screen.queryByRole('meter')).not.toBeInTheDocument();
  });
});
