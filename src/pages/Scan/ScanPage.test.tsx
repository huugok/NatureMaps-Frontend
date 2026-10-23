import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { identifyPlant } from '../../services/identify';
import type { PlantIdentification } from '../../types/identify';
import { ScanPage } from './ScanPage';

vi.mock('../../services/identify', () => ({
  identifyPlant: vi.fn(),
}));

const mockIdentifyPlant = vi.mocked(identifyPlant);

const identification: PlantIdentification = {
  bestMatch: 'Papaver rhoeas',
  remainingIdentificationRequests: 42,
  results: [
    { score: 0.75, scientificName: 'Papaver rhoeas', author: 'L.', family: 'Papaveraceae', genus: 'Papaver', commonNames: ['Amapola'], gbifId: '2876818' },
    { score: 0.1, scientificName: 'Papaver dubium', author: 'L.', family: 'Papaveraceae', genus: 'Papaver', commonNames: [], gbifId: null },
  ],
};

function foto(nombre: string, tipo = 'image/jpeg'): File {
  return new File(['foto-de-prueba'], nombre, { type: tipo });
}

describe('ScanPage — UT F04: envío de foto a Pl@ntNet', () => {
  beforeEach(() => {
    mockIdentifyPlant.mockReset();
  });

  test('PA 658: una foto seleccionada se envía y la identificación continúa', async () => {
    mockIdentifyPlant.mockResolvedValue(identification);
    const user = userEvent.setup();
    render(<ScanPage />);

    await user.upload(screen.getByLabelText('Foto de la planta'), foto('amapola.jpg'));
    expect(screen.getByRole('button', { name: 'Identificar' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Identificar' }));

    expect(mockIdentifyPlant).toHaveBeenCalledTimes(1);
    expect(mockIdentifyPlant.mock.calls[0]?.[0]).toBeInstanceOf(Blob);
    expect(mockIdentifyPlant.mock.calls[0]?.[1]).toBe('amapola.jpg');
    // La app informa de que el envío se completó y el proceso continúa.
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/identificación completada/i));
    expect(screen.getByText(/2 especies candidatas/i)).toBeInTheDocument();
    // Las candidatas se muestran en texto: nombre, puntuación y nombres comunes.
    expect(screen.getByText(/Papaver rhoeas L\. — 75,0% — Amapola/)).toBeInTheDocument();
    expect(screen.getByText(/Papaver dubium/)).toBeInTheDocument();
  });

  test('PA 659: se puede enviar una nueva foto y sustituye a la anterior', async () => {
    mockIdentifyPlant.mockResolvedValue(identification);
    const user = userEvent.setup();
    render(<ScanPage />);

    await user.upload(screen.getByLabelText('Foto de la planta'), foto('primera.jpg'));
    await user.click(screen.getByRole('button', { name: 'Identificar' }));
    await waitFor(() => expect(screen.getByRole('status')).toBeTruthy());

    mockIdentifyPlant.mockResolvedValue({ ...identification, results: [] });
    await user.upload(screen.getByLabelText('Foto de la planta'), foto('segunda.png', 'image/png'));
    await user.click(screen.getByRole('button', { name: 'Identificar' }));

    expect(mockIdentifyPlant).toHaveBeenCalledTimes(2);
    expect(mockIdentifyPlant.mock.calls[1]?.[1]).toBe('segunda.png');
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/identificación completada/i));
  });

  test('PA 660: un fallo del envío se comunica al usuario y permite reintentar', async () => {
    mockIdentifyPlant.mockRejectedValue(new Error('No se ha podido contactar con el servidor de identificación'));
    const user = userEvent.setup();
    render(<ScanPage />);

    await user.upload(screen.getByLabelText('Foto de la planta'), foto('amapola.jpg'));
    await user.click(screen.getByRole('button', { name: 'Identificar' }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/no ha sido posible completar el envío/i));
    expect(screen.getByText(/no se ha podido contactar con el servidor/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Identificar' })).toBeEnabled();

    mockIdentifyPlant.mockResolvedValue(identification);
    await user.click(screen.getByRole('button', { name: 'Identificar' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/identificación completada/i));
  });
});
