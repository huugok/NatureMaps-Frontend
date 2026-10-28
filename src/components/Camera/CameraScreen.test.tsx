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
});


describe('CameraScreen — escaneo desde la galería (UT F05)', () => {
  const bajaConfianza = {
    bestMatch: null,
    remainingIdentificationRequests: 9,
    results: [
      { score: 0.44, scientificName: 'Ficus benjamina', author: null, family: null, genus: null, commonNames: ['Ficus'], gbifId: null },
      { score: 0.31, scientificName: 'Jacaranda mimosifolia', author: null, family: null, genus: null, commonNames: ['Jacaranda'], gbifId: null },
    ],
  };

  const elegirDeGaleria = (nombre = 'planta.jpg') => {
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['foto'], nombre, { type: 'image/jpeg' });
    fireEvent.change(input, { target: { files: [file] } });
  };

  it('una foto de la galería se ve en la vista previa y se puede identificar', async () => {
    const onIdentifyPhoto = vi.fn();
    render(<CameraScreen onClose={vi.fn()} onIdentifyPhoto={onIdentifyPhoto} />);

    elegirDeGaleria();

    await waitFor(() =>
      expect(screen.getByAltText('Vista previa de la foto capturada')).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Identificar foto' }));

    expect(onIdentifyPhoto).toHaveBeenCalledTimes(1);
    expect(onIdentifyPhoto.mock.calls[0]?.[0]).toMatch(/^data:image/);
    expect(onIdentifyPhoto.mock.calls[0]?.[1]).toBe('planta');
  });

  it('tras identificar la foto de la galería muestra las especies alternativas', async () => {
    const { rerender } = render(<CameraScreen onClose={vi.fn()} />);

    elegirDeGaleria('planta.jpg');
    await waitFor(() =>
      expect(screen.getByAltText('Vista previa de la foto capturada')).toBeInTheDocument(),
    );

    rerender(
      <CameraScreen
        onClose={vi.fn()}
        identificationStatus="completed"
        identificationResults={bajaConfianza}
      />,
    );

    expect(screen.getByText('Especie más probable')).toBeInTheDocument();
    expect(screen.getByText('Ficus benjamina')).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(1);

    fireEvent.click(screen.getByRole('radio', { name: /Jacaranda/ }));

    expect(screen.getByText(/Especie elegida: Jacaranda mimosifolia/)).toBeInTheDocument();
  });
});
