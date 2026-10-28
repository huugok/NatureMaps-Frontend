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
    // El resultado muestra la especie más probable y su certeza.
    await waitFor(() => expect(screen.getByText('Especie más probable')).toBeInTheDocument());
    expect(screen.getByText('Papaver rhoeas')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText('Certeza alta')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Papaver dubium/ })).toBeInTheDocument();
  });

  test('PA 659: se puede enviar una nueva foto y sustituye a la anterior', async () => {
    mockIdentifyPlant.mockResolvedValue(identification);
    const user = userEvent.setup();
    render(<ScanPage />);

    await user.upload(screen.getByLabelText('Foto de la planta'), foto('primera.jpg'));
    await user.click(screen.getByRole('button', { name: 'Identificar' }));
    await waitFor(() => expect(screen.getByText('Especie más probable')).toBeInTheDocument());

    mockIdentifyPlant.mockResolvedValue({ ...identification, results: [] });
    await user.upload(screen.getByLabelText('Foto de la planta'), foto('segunda.png', 'image/png'));
    expect(screen.queryByText('Especie más probable')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Identificar' }));

    expect(mockIdentifyPlant).toHaveBeenCalledTimes(2);
    expect(mockIdentifyPlant.mock.calls[1]?.[1]).toBe('segunda.png');
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(/no ha encontrado candidatas/i),
    );
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
    await waitFor(() => expect(screen.getByText('Especie más probable')).toBeInTheDocument());
  });

  test('«Ver ficha» abre la especie más probable cuando la pantalla lo permite', async () => {
    mockIdentifyPlant.mockResolvedValue(identification);
    const onOpenSpecies = vi.fn();
    const user = userEvent.setup();
    render(<ScanPage onOpenSpecies={onOpenSpecies} />);

    await user.upload(screen.getByLabelText('Foto de la planta'), foto('amapola.jpg'));
    await user.click(screen.getByRole('button', { name: 'Identificar' }));
    await user.click(screen.getByRole('button', { name: 'Ver ficha' }));

    expect(onOpenSpecies).toHaveBeenCalledTimes(1);
    expect(onOpenSpecies).toHaveBeenCalledWith(
      expect.objectContaining({ scientificName: 'Papaver rhoeas' }),
      expect.stringMatching(/^data:image/),
    );
  });
});

describe('ScanPage — UT F05 (PA 689): especies alternativas', () => {
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

  test('con confianza baja muestra la más probable y las alternativas ordenadas', async () => {
    await identificarCon(confianzaBaja);

    expect(screen.getByText('Ficus benjamina')).toBeInTheDocument();
    expect(screen.getByText('42%')).toBeInTheDocument();
    expect(screen.getByText('Certeza baja')).toBeInTheDocument();

    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(2);
    expect(radios[0]).toHaveAccessibleName(/Jacaranda/);
    expect(radios[1]).toHaveAccessibleName(/Aligustre/);

    expect(screen.getByText('31%')).toBeInTheDocument();
    expect(screen.getByText('12%')).toBeInTheDocument();
  });

  test('el usuario puede elegir una de las especies mostradas', async () => {
    const user = await identificarCon(confianzaBaja);

    await user.click(screen.getByRole('radio', { name: /Jacaranda/ }));

    expect(screen.getByRole('radio', { name: /Jacaranda/ })).toBeChecked();
    expect(screen.getByText(/Especie elegida: Jacaranda mimosifolia/)).toBeInTheDocument();
  });

  test('una nueva foto descarta la especie elegida', async () => {
    const user = await identificarCon(confianzaBaja);

    await user.click(screen.getByRole('radio', { name: /Jacaranda/ }));
    expect(screen.getByText(/Especie elegida: Jacaranda mimosifolia/)).toBeInTheDocument();

    await user.upload(screen.getByLabelText('Foto de la planta'), foto('otra.jpg'));
    expect(screen.queryByText(/Especie elegida/)).not.toBeInTheDocument();
  });

  test('«repetir foto» vuelve al formulario y limpia la foto', async () => {
    const user = await identificarCon(confianzaBaja);

    await user.click(screen.getByRole('button', { name: /repetir foto/i }));

    expect(screen.queryByText('Especie más probable')).not.toBeInTheDocument();
    expect(screen.queryByText(/Foto seleccionada/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Identificar' })).toBeDisabled();
  });
});
