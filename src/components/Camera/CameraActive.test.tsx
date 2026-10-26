import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { CameraActive } from './CameraActive';

const capturedPhoto = 'data:image/jpeg;base64,dGVzdA==';

function renderCamera(identificationError: string) {
  const onIdentifyPhoto = vi.fn();
  render(
    <CameraActive
      mode="planta"
      onModeChange={vi.fn()}
      onClose={vi.fn()}
      onSelectFromGallery={vi.fn()}
      onIdentifyPhoto={onIdentifyPhoto}
      onSavePhoto={vi.fn(() => true)}
      identificationStatus="error"
      identificationResults={null}
      identificationError={identificationError}
    />,
  );

  fireEvent.click(screen.getByRole('button', { name: /hacer foto/i }));
  return { onIdentifyPhoto };
}

describe('CameraActive error responses', () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      fillRect: vi.fn(),
      fillText: vi.fn(),
      drawImage: vi.fn(),
      set fillStyle(_value: string) {},
      set font(_value: string) {},
      set textAlign(_value: CanvasTextAlign) {},
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(capturedPhoto);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('shows the generic pending identification response without technical errors', () => {
    renderCamera('No se ha podido contactar con el servidor de identificación');

    expect(screen.getByRole('heading', { name: 'Planta sin identificar' })).toBeInTheDocument();
    expect(screen.getByText('Identificación pendiente')).toBeInTheDocument();
    expect(screen.getByText(/aún no tenemos información verificada/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reintentar identificación' })).toBeInTheDocument();
    expect(screen.queryByText('No se ha podido contactar con el servidor de identificación')).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Foto de la planta' })).toHaveAttribute('src', capturedPhoto);
  });

  it('does not show the pending screen for identification or API errors', () => {
    renderCamera('Respuesta no válida de Pl@ntNet');

    expect(screen.queryByRole('heading', { name: 'Planta sin identificar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'No se pudo identificar' })).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('No se ha podido identificar la foto.');
    expect(screen.getByText('Respuesta no válida de Pl@ntNet')).toBeInTheDocument();
  });

  it('retries identification with the captured photo', () => {
    const { onIdentifyPhoto } = renderCamera('No se ha podido contactar con el servidor de identificación');

    const retryButtons = screen.getAllByRole('button', { name: /^Reintentar/ });
    fireEvent.click(retryButtons[retryButtons.length - 1]);

    expect(onIdentifyPhoto).toHaveBeenCalledWith(capturedPhoto, 'planta');
  });
});
