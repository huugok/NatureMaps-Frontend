import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { CameraScreen } from './CameraScreen';

describe('CameraScreen Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the initial permission request prompt', () => {
    render(<CameraScreen onClose={vi.fn()} />);

    expect(
      screen.getByText(/necesitamos tu cámara para reconocer plantas/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /^permitir cámara$/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /^no permitir cámara$/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /elegir de la galería/i })
    ).toBeInTheDocument();
  });

  it('shows permission denied screen with explanation when user rejects permission', async () => {
    render(<CameraScreen onClose={vi.fn()} />);

    const denyButton = await screen.findByRole('button', { name: /^no permitir cámara$/i });
    fireEvent.click(denyButton);

    expect(screen.getByText(/la cámara está desactivada/i)).toBeInTheDocument();
    expect(
      screen.getByText(/sin permiso no podemos hacer la foto/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /abrir ajustes del móvil/i })
    ).toBeInTheDocument();
  });

  it('allows toggling between Planta and Monumento o calle in the denied state', async () => {
    render(<CameraScreen onClose={vi.fn()} />);

    fireEvent.click(await screen.findByRole('button', { name: /^no permitir cámara$/i }));

    const monumentoBtn = screen.getByRole('button', { name: /monumento o calle/i });
    fireEvent.click(monumentoBtn);
    expect(monumentoBtn).toHaveClass('font-bold');
  });

  it('transitions to active camera view when permission is allowed', async () => {
    // Mock navigator.mediaDevices.getUserMedia
    const mockTrack = { stop: vi.fn(), applyConstraints: vi.fn() };
    const mockStream = {
      getTracks: () => [mockTrack],
      getVideoTracks: () => [mockTrack],
    };

    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn().mockResolvedValue(mockStream),
      },
      writable: true,
      configurable: true,
    });

    render(<CameraScreen onClose={vi.fn()} />);

    const allowButton = screen.getByRole('button', { name: /^permitir cámara$/i });
    fireEvent.click(allowButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /hacer foto/i })).toBeInTheDocument();
    });

    expect(screen.getByText(/encuadra la hoja, flor o fruto/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /planta/i })).toBeInTheDocument();
  });

  it('updates instructions when switching to Monumento o calle in active camera', async () => {
    const mockTrack = { stop: vi.fn(), applyConstraints: vi.fn() };
    const mockStream = {
      getTracks: () => [mockTrack],
      getVideoTracks: () => [mockTrack],
    };

    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn().mockResolvedValue(mockStream),
      },
      writable: true,
      configurable: true,
    });

    render(<CameraScreen onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /^permitir cámara$/i }));

    await waitFor(() => {
      expect(screen.getByText(/encuadra la hoja, flor o fruto/i)).toBeInTheDocument();
    });

    const monumentoBtn = screen.getByRole('button', { name: /monumento o calle/i });
    fireEvent.click(monumentoBtn);

    expect(screen.getByText(/encuadra el monumento o la calle/i)).toBeInTheDocument();
    expect(screen.getByText(/te diremos qué es y su importancia cultural/i)).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked in prompt', () => {
    const handleClose = vi.fn();
    render(<CameraScreen onClose={handleClose} />);

    const backBtn = screen.getByRole('button', { name: /volver/i });
    fireEvent.click(backBtn);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('ofrece abrir la ficha de la especie identificada cuando hay match en el catálogo', async () => {
    const mockTrack = { stop: vi.fn(), applyConstraints: vi.fn() };
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [mockTrack], getVideoTracks: () => [mockTrack] }) },
      writable: true,
      configurable: true,
    });
    const onOpenSpeciesFicha = vi.fn();

    // jsdom no implementa canvas: sin este stub la captura simulada no abre la vista previa.
    const canvasCtx = { drawImage: vi.fn(), fillRect: vi.fn(), fillText: vi.fn() };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(canvasCtx as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/jpeg;base64,Zm90bw==');

    render(
      <CameraScreen
        onClose={vi.fn()}
        identificationStatus="completed"
        identificationResults={{
          bestMatch: 'Jacaranda mimosifolia',
          remainingIdentificationRequests: 42,
          results: [{ score: 0.91, scientificName: 'Jacaranda mimosifolia', author: null,
            family: null, genus: null, commonNames: ['Jacaranda'], gbifId: null }],
        }}
        identifiedSpecies={{ name: 'Jacaranda' }}
        onOpenSpeciesFicha={onOpenSpeciesFicha}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /^permitir cámara$/i }));
    fireEvent.click(await screen.findByRole('button', { name: /hacer foto/i }));

    const verFicha = await screen.findByRole('button', { name: 'Ver ficha de Jacaranda' });
    fireEvent.click(verFicha);

    expect(onOpenSpeciesFicha).toHaveBeenCalledTimes(1);
  });

  it('no ofrece abrir ficha cuando la especie identificada no está en el catálogo', async () => {
    const mockTrack = { stop: vi.fn(), applyConstraints: vi.fn() };
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [mockTrack], getVideoTracks: () => [mockTrack] }) },
      writable: true,
      configurable: true,
    });

    // jsdom no implementa canvas: sin este stub la captura simulada no abre la vista previa.
    const canvasCtx = { drawImage: vi.fn(), fillRect: vi.fn(), fillText: vi.fn() };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(canvasCtx as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/jpeg;base64,Zm90bw==');

    render(
      <CameraScreen
        onClose={vi.fn()}
        identificationStatus="completed"
        identificationResults={{
          bestMatch: 'Orchus inexistentus',
          remainingIdentificationRequests: 42,
          results: [{ score: 0.6, scientificName: 'Orchus inexistentus', author: null,
            family: null, genus: null, commonNames: [], gbifId: null }],
        }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /^permitir cámara$/i }));
    fireEvent.click(await screen.findByRole('button', { name: /hacer foto/i }));

    expect(await screen.findByText(/candidatas más probables/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /ver ficha de/i })).not.toBeInTheDocument();
  });
});

