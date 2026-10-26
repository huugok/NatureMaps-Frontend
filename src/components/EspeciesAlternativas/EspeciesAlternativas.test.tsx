import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import type { PlantMatch } from '../../types/identify';
import { EspeciesAlternativas } from './EspeciesAlternativas';

function candidata(
  scientificName: string,
  score: number,
  commonNames: string[] = [],
): PlantMatch {
  return {
    score,
    scientificName,
    author: null,
    family: null,
    genus: null,
    commonNames,
    gbifId: null,
  };
}

const renderLista = (matches: PlantMatch[], selectedName: string | null = null, onSelect = vi.fn()) =>
  render(
    <EspeciesAlternativas matches={matches} selectedName={selectedName} onSelect={onSelect} />,
  );

describe('EspeciesAlternativas — UT F05 (PA 689)', () => {
  it('ordena las especies de mayor a menor confianza aunque lleguen desordenadas', () => {
    renderLista([
      candidata('Jacaranda mimosifolia', 0.78, ['Jacaranda']),
      candidata('Ligustrum lucidum', 0.41, ['Aligustre']),
      candidata('Ficus benjamina', 0.92, ['Ficus']),
    ]);

    const nombres = screen
      .getAllByRole('radio')
      .map((radio) => radio.closest('label')?.textContent ?? '');

    expect(nombres[0]).toContain('Ficus');
    expect(nombres[1]).toContain('Jacaranda');
    expect(nombres[2]).toContain('Aligustre');
  });

  it('muestra el porcentaje de confianza de cada especie', () => {
    renderLista([
      candidata('Ficus benjamina', 0.92, ['Ficus']),
      candidata('Jacaranda mimosifolia', 0.78, ['Jacaranda']),
    ]);

    expect(screen.getByText('92% de confianza')).toBeInTheDocument();
    expect(screen.getByText('78% de confianza')).toBeInTheDocument();
  });

  it('avisa de que la elección es del usuario y llama a onSelect con el nombre científico', async () => {
    const onSelect = vi.fn();
    renderLista([candidata('Ficus benjamina', 0.92, ['Ficus'])], null, onSelect);

    await userEvent.click(screen.getByRole('radio', { name: /Ficus/ }));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith('Ficus benjamina');
  });

  it('marca como elegida la especie seleccionada', () => {
    renderLista(
      [
        candidata('Ficus benjamina', 0.92, ['Ficus']),
        candidata('Jacaranda mimosifolia', 0.78, ['Jacaranda']),
      ],
      'Jacaranda mimosifolia',
    );

    expect(screen.getByRole('radio', { name: /Jacaranda/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: /Ficus/ })).not.toBeChecked();
  });

  it('usa el nombre científico cuando la especie no trae nombre común', () => {
    renderLista([candidata('Papaver dubium', 0.42)]);

    expect(screen.getByRole('radio', { name: /Papaver dubium/ })).toBeInTheDocument();
  });

  it('limita el número de alternativas y deja fuera la de menor confianza', () => {
    renderLista([
      candidata('Especie 1', 0.49),
      candidata('Especie 2', 0.48),
      candidata('Especie 3', 0.47),
      candidata('Especie 4', 0.46),
      candidata('Especie 5', 0.45),
      candidata('Especie 6', 0.1),
    ]);

    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(5);
    expect(screen.queryByRole('radio', { name: /Especie 6/ })).not.toBeInTheDocument();
  });

  it('etiqueta como «Muy parecido» solo las especies con confianza muy alta', () => {
    renderLista([
      candidata('Ficus benjamina', 0.92, ['Ficus']),
      candidata('Jacaranda mimosifolia', 0.78, ['Jacaranda']),
    ]);

    expect(screen.getAllByText('Muy parecido')).toHaveLength(1);
    expect(screen.getByRole('radio', { name: /Ficus/ })).toHaveAccessibleName(/Muy parecido/);
    expect(screen.getByRole('radio', { name: /Jacaranda/ })).not.toHaveAccessibleName(
      /Muy parecido/,
    );
  });
});
