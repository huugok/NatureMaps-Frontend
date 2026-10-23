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

// Identificación clara (score >= 0.5): solo la especie más probable (PA 661).
const clara: PlantIdentification = {
  bestMatch: 'Quercus ilex',
  remainingIdentificationRequests: 42,
  results: [
    {
      score: 0.57,
      scientificName: 'Quercus ilex',
      author: 'L.',
      family: 'Fagaceae',
      genus: 'Quercus',
      commonNames: ['Encina', 'Chaparro', 'Carrasca'],
      gbifId: '2879098',
    },
    {
      score: 0.06,
      scientificName: 'Ficus cordata',
      author: 'Thunb.',
      family: 'Moraceae',
      genus: 'Ficus',
      commonNames: [],
      gbifId: '8141207',
    },
  ],
};

// Identificación poco clara (scores bajos): varias opciones (PA 662), como en
// la verificación real con la foto de amapola en campo.
const pocoClara: PlantIdentification = {
  bestMatch: 'Papaver rhoeas',
  remainingIdentificationRequests: 499,
  results: [
    {
      score: 0.028,
      scientificName: 'Papaver rhoeas',
      author: 'L.',
      family: 'Papaveraceae',
      genus: 'Papaver',
      commonNames: ['Amapola', 'Ababol'],
      gbifId: '2888443',
    },
    {
      score: 0.011,
      scientificName: 'Papaver arenarium',
      author: 'M.Bieb.',
      family: 'Papaveraceae',
      genus: 'Papaver',
      commonNames: [],
      gbifId: '7315108',
    },
  ],
};

function foto(nombre: string, tipo = 'image/jpeg'): File {
  return new File(['foto-de-prueba'], nombre, { type: tipo });
}

describe('ScanPage — UT 931: especie más probable', () => {
  beforeEach(() => {
    mockIdentifyPlant.mockReset();
  });

  test('PA 661: con certeza suficiente muestra la especie más probable con nombre común y científico', async () => {
    mockIdentifyPlant.mockResolvedValue(clara);
    const user = userEvent.setup();
    render(<ScanPage />);

    await user.upload(screen.getByLabelText('Foto de la planta'), foto('encina.jpg'));
    await user.click(screen.getByRole('button', { name: 'Identificar' }));

    // Nombre común + científico de la especie más probable, y nada que elegir.
    await waitFor(() => expect(screen.getByText('Encina (Quercus ilex) L.')).toBeInTheDocument());
    expect(screen.getByText(/57,0% de puntuación/i)).toBeInTheDocument();
    expect(screen.getByText(/identificación clara/i)).toBeInTheDocument();
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
  });

  test('PA 662: sin certeza suficiente muestra varias opciones y permite elegir una', async () => {
    mockIdentifyPlant.mockResolvedValue(pocoClara);
    const user = userEvent.setup();
    render(<ScanPage />);

    await user.upload(screen.getByLabelText('Foto de la planta'), foto('amapola.jpg'));
    await user.click(screen.getByRole('button', { name: 'Identificar' }));

    // La especie más probable sigue visible y aparecen varias opciones.
    await waitFor(() => expect(screen.getByText(/especie más probable/i)).toBeInTheDocument());
    expect(screen.getAllByRole('radio')).toHaveLength(2);
    expect(screen.getByRole('radio', { name: /Papaver rhoeas L\. — 2,8%/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Papaver arenarium M\.Bieb\. — 1,1%/ })).toBeInTheDocument();

    // El usuario elige la que considera correcta.
    await user.click(screen.getByRole('radio', { name: /Papaver arenarium M\.Bieb\. — 1,1%$/ }));
    expect(screen.getByText('Especie elegida: Papaver arenarium')).toBeInTheDocument();
  });

  test('PA 663: una nueva identificación muestra el resultado de la nueva foto', async () => {
    mockIdentifyPlant.mockResolvedValue(pocoClara);
    const user = userEvent.setup();
    render(<ScanPage />);

    await user.upload(screen.getByLabelText('Foto de la planta'), foto('amapola.jpg'));
    await user.click(screen.getByRole('button', { name: 'Identificar' }));
    await waitFor(() => expect(screen.getAllByText(/Papaver rhoeas/).length).toBeGreaterThan(0));

    // Nueva foto → nueva identificación → solo el resultado nuevo.
    mockIdentifyPlant.mockResolvedValue(clara);
    await user.upload(screen.getByLabelText('Foto de la planta'), foto('encina.jpg'));
    await user.click(screen.getByRole('button', { name: 'Identificar' }));

    await waitFor(() => expect(screen.getByText('Encina (Quercus ilex) L.')).toBeInTheDocument());
    expect(screen.queryAllByText(/Papaver rhoeas/)).toHaveLength(0);
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

    mockIdentifyPlant.mockResolvedValue(clara);
    await user.click(screen.getByRole('button', { name: 'Identificar' }));
    await waitFor(() => expect(screen.getByText('Encina (Quercus ilex) L.')).toBeInTheDocument());
  });
});
