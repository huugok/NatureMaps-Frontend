import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import type { PlantMatch } from '../../types/identify';
import { ResultadoEscaneo } from './ResultadoEscaneo';

function candidata(
  scientificName: string,
  score: number,
  extras: Partial<PlantMatch> = {},
): PlantMatch {
  return {
    score,
    scientificName,
    author: null,
    family: null,
    genus: null,
    commonNames: [],
    gbifId: null,
    ...extras,
  };
}

const clara: PlantMatch[] = [
  candidata('Jacaranda mimosifolia', 0.82, {
    family: 'Bignoniaceae',
    commonNames: ['Jacaranda'],
  }),
  candidata('Paulownia tomentosa', 0.09),
  candidata('Melia azedarach', 0.05),
];

const renderResultado = (
  props: Partial<React.ComponentProps<typeof ResultadoEscaneo>> = {},
) =>
  render(
    <ResultadoEscaneo
      photoUrl="data:image/jpeg;base64,foto"
      matches={clara}
      onBack={vi.fn()}
      onRepeatPhoto={vi.fn()}
      {...props}
    />,
  );

describe('ResultadoEscaneo — UT F05 (RF18 · PA 689)', () => {
  it('muestra la foto escaneada, la especie más probable y su confianza', () => {
    renderResultado();

    expect(screen.getByRole('img', { name: 'Foto escaneada de la planta' })).toBeInTheDocument();
    expect(screen.getByText('Tu foto')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Especie más probable' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Jacaranda mimosifolia')).toBeInTheDocument();
    expect(screen.getByText('Jacaranda · Bignoniaceae')).toBeInTheDocument();
    expect(screen.getByText('82%')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: /Jacaranda mimosifolia/ })).toHaveAttribute(
      'aria-valuenow',
      '82',
    );
    expect(screen.getByText('Certeza alta')).toBeInTheDocument();
  });

  it('si no hay foto pinta el marcador verde de la cabecera', () => {
    renderResultado({ photoUrl: null });

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('Tu foto')).toBeInTheDocument();
  });

  it('el botón «Ver ficha» abre la especie más probable', async () => {
    const onOpenPrimary = vi.fn();
    renderResultado({ onOpenPrimary });

    await userEvent.click(screen.getByRole('button', { name: 'Ver ficha' }));

    expect(onOpenPrimary).toHaveBeenCalledTimes(1);
    expect(onOpenPrimary).toHaveBeenCalledWith(
      expect.objectContaining({ scientificName: 'Jacaranda mimosifolia' }),
    );
  });

  it('sin callback de ficha no pinta el botón «Ver ficha»', () => {
    renderResultado();

    expect(screen.queryByRole('button', { name: 'Ver ficha' })).not.toBeInTheDocument();
  });

  it('lista las alternativas sin repetir la especie principal', () => {
    renderResultado();

    expect(
      screen.getByRole('heading', { name: '¿No es esta? Otras posibles' }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(2);
    expect(screen.queryByRole('radio', { name: /Jacaranda mimosifolia/ })).not.toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Paulownia tomentosa/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Melia azedarach/ })).toBeInTheDocument();
  });

  it('permite seleccionar una alternativa y lo confirma', async () => {
    const onSelectAlternative = vi.fn();
    const { rerender } = renderResultado({ onSelectAlternative });

    await userEvent.click(screen.getByRole('radio', { name: /Paulownia tomentosa/ }));
    expect(onSelectAlternative).toHaveBeenCalledWith('Paulownia tomentosa');

    rerender(
      <ResultadoEscaneo
        photoUrl="data:image/jpeg;base64,foto"
        matches={clara}
        selectedName="Paulownia tomentosa"
        onSelectAlternative={onSelectAlternative}
        onBack={vi.fn()}
        onRepeatPhoto={vi.fn()}
      />,
    );

    expect(screen.getByRole('radio', { name: /Paulownia tomentosa/ })).toBeChecked();
    expect(screen.getByText('Especie elegida: Paulownia tomentosa')).toBeInTheDocument();
  });

  it('avisa de certeza baja cuando la mejor coincidencia no es concluyente', () => {
    renderResultado({ matches: clara.map((match) => ({ ...match, score: match.score * 0.5 })) });

    expect(screen.getByText('Certeza baja')).toBeInTheDocument();
  });

  it('el botón de volver y el de repetir foto avisan', async () => {
    const onBack = vi.fn();
    const onRepeatPhoto = vi.fn();
    renderResultado({ onBack, onRepeatPhoto });

    await userEvent.click(screen.getByRole('button', { name: 'Volver' }));
    await userEvent.click(screen.getByRole('button', { name: /repetir foto/i }));

    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onRepeatPhoto).toHaveBeenCalledTimes(1);
  });

  it('avisa cuando Pl@ntNet no devuelve candidatas', () => {
    renderResultado({ matches: [] });

    expect(screen.getByRole('status')).toHaveTextContent(/no ha encontrado candidatas/i);
    expect(screen.getByRole('button', { name: /repetir foto/i })).toBeInTheDocument();
    expect(screen.queryByText('Especie más probable')).not.toBeInTheDocument();
  });

  it('limita las alternativas a cuatro además de la principal', () => {
    renderResultado({
      matches: [
        candidata('Principal', 0.9),
        candidata('Alternativa 1', 0.05),
        candidata('Alternativa 2', 0.04),
        candidata('Alternativa 3', 0.03),
        candidata('Alternativa 4', 0.02),
        candidata('Alternativa 5', 0.01),
      ],
    });

    expect(screen.getAllByRole('radio')).toHaveLength(4);
    expect(screen.queryByRole('radio', { name: /Alternativa 5/ })).not.toBeInTheDocument();
  });
});
