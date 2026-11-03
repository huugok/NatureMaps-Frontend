import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { CameraActive } from './CameraActive';

const capturedPhoto = 'data:image/jpeg;base64,dGVzdA==';

function renderCamera(identificationError: string) {
  const onIdentifyPhoto = vi.fn();
  const onPhotoCaptured = vi.fn();
  const onPhotoChange = vi.fn();
  render(
    <CameraActive
      mode="planta"
      onModeChange={vi.fn()}
      onClose={vi.fn()}
      onSelectFromGallery={vi.fn()}
      onPhotoCaptured={onPhotoCaptured}
      onIdentifyPhoto={onIdentifyPhoto}
      onSavePhoto={vi.fn(() => true)}
      identificationStatus="error"
      identificationResults={null}
      identificationError={identificationError}
      photo={capturedPhoto}
      onPhotoChange={onPhotoChange}
    />,
  );
  return { onIdentifyPhoto, onPhotoCaptured, onPhotoChange };
}

describe('CameraActive — respuesta sin conexión', () => {
  it('muestra la respuesta pendiente sin filtrar el error técnico', () => {
    renderCamera('No se ha podido contactar con el servidor de identificación');

    expect(screen.getByRole('heading', { name: 'Planta sin identificar' })).toBeInTheDocument();
    expect(screen.getByText('Identificación pendiente')).toBeInTheDocument();
    expect(screen.getByText(/aún no tenemos información verificada/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reintentar identificación' })).toBeInTheDocument();
    expect(
      screen.queryByText('No se ha podido contactar con el servidor de identificación'),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Foto de la planta' })).toHaveAttribute(
      'src',
      capturedPhoto,
    );
  });

  it('no muestra la respuesta pendiente para errores de identificación o de la API', () => {
    renderCamera('Respuesta no válida de Pl@ntNet');

    expect(
      screen.queryByRole('heading', { name: 'Planta sin identificar' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('No se ha podido identificar la foto.');
    expect(screen.getByText('Respuesta no válida de Pl@ntNet')).toBeInTheDocument();
  });

  it('reintenta la identificación con la foto capturada', () => {
    const { onIdentifyPhoto } = renderCamera(
      'No se ha podido contactar con el servidor de identificación',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar identificación' }));

    expect(onIdentifyPhoto).toHaveBeenCalledWith(capturedPhoto, 'planta');
  });

  it('vuelve a la cámara descartando la foto y el estado de error', () => {
    const { onPhotoCaptured, onPhotoChange } = renderCamera(
      'No se ha podido contactar con el servidor de identificación',
    );

    const backButtons = screen.getAllByRole('button', { name: 'Volver a la cámara' });
    fireEvent.click(backButtons[backButtons.length - 1]);

    expect(onPhotoChange).toHaveBeenCalledWith(null);
    expect(onPhotoCaptured).toHaveBeenCalledWith('', 'planta');
  });
});
