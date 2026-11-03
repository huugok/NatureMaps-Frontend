import { describe, expect, it } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import { renderWithProviders } from '../../test/renderWithProviders';
import { ColorLab } from './ColorLab';

describe('ColorLab', () => {
  it('abre en la paleta recomendada y muestra la vista previa', () => {
    renderWithProviders(<ColorLab />, { route: '/color' });

    expect(screen.getByRole('heading', { name: 'Verde dehesa' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Vista previa de la paleta' })).toBeInTheDocument();
  });

  it('cambia la paleta al elegir otra propuesta', () => {
    renderWithProviders(<ColorLab />, { route: '/color' });

    fireEvent.click(screen.getByRole('button', { name: 'Azahar' }));

    expect(screen.getByRole('heading', { name: 'Azahar' })).toBeInTheDocument();
    const preview = screen.getByRole('region', { name: 'Vista previa de la paleta' });
    expect(within(preview).getByText(/más valenciana/i)).toBeInTheDocument();
  });
});
