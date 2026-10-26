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

describe('ScanPage — UT F05 (PA 689): especies alternativas con confianza baja', () => {
  const confianzaBaja: PlantIdentification = {
    bestMatch: null,
    remainingIdentificationRequests: 12,
    results: [
      { score: 0.31, scientificName: 'Jacaranda mimosifolia', author: null, family: null, genus: null, commonNames: ['Jacaranda'], gbifId: null },
      { score: 0.42, scientificName: 'Ficus benjamina', author: null, family: null, genus: null, commonNames: ['Ficus'], gbifId: null },
      { score: 0.12, scientificName: 'Ligustrum lucidum', author: null, family: null, genus: null, commonNames: ['Aligustre'], gbifId: null },
    ],
  };

  beforeEach(() => {
    mockIdentifyPlant.mockReset();
  });

  async function identificarCon(resultado: PlantIdentification) {
    const user = userEvent.setup();
    mockIdentifyPlant.mockResolvedValue(resultado);
    render(<ScanPage />);
    await user.upload(screen.getByLabelText('Foto de la planta'), foto('planta.jpg'));
    await user.click(screen.getByRole('button', { name: 'Identificar' }));
    await waitFor(() => expect(mockIdentifyPlant).toHaveBeenCalledTimes(1));
    return user;
  }

  test('con confianza baja muestra las alternativas ordenadas y con su porcentaje', async () => {
    await identificarCon(confianzaBaja);

    expect(
      screen.getByRole('heading', { name: 'Especies alternativas' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/la confianza de la mejor coincidencia es baja/i)).toBeInTheDocument();

    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(3);
    expect(radios[0]).toHaveAccessibleName(/Ficus/);
    expect(radios[1]).toHaveAccessibleName(/Jacaranda/);
    expect(radios[2]).toHaveAccessibleName(/Aligustre/);

    expect(screen.getByText('42% de confianza')).toBeInTheDocument();
    expect(screen.getByText('31% de confianza')).toBeInTheDocument();
    expect(screen.getByText('12% de confianza')).toBeInTheDocument();
  });

  test('el usuario puede elegir una de las especies mostradas', async () => {
    const user = await identificarCon(confianzaBaja);

    await user.click(screen.getByRole('radio', { name: /Jacaranda/ }));

    expect(screen.getByRole('radio', { name: /Jacaranda/ })).toBeChecked();
    expect(screen.getByText(/Especie elegida: Jacaranda mimosifolia/)).toBeInTheDocument();
  });

  test('con confianza suficiente no ofrece alternativas y sigue listando candidatas', async () => {
    await identificarCon(identification);

    expect(
      screen.queryByRole('heading', { name: 'Especies alternativas' }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/Papaver rhoeas L\. — 75,0% — Amapola/)).toBeInTheDocument();
  });

  test('una nueva foto descarta la especie elegida', async () => {
    const user = await identificarCon(confianzaBaja);

    await user.click(screen.getByRole('radio', { name: /Ficus/ }));
    expect(screen.getByText(/Especie elegida: Ficus benjamina/)).toBeInTheDocument();

    await user.upload(screen.getByLabelText('Foto de la planta'), foto('otra.jpg'));
    expect(screen.queryByText(/Especie elegida/)).not.toBeInTheDocument();
  });
});
