import { describe, expect, it } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import { renderWithProviders } from '../../test/renderWithProviders';
import { TypographyLab } from './TypographyLab';

describe('TypographyLab', () => {
  it('abre en la dirección recomendada y carga las fuentes del laboratorio', () => {
    renderWithProviders(<TypographyLab />, { route: '/tipografia' });

    expect(screen.getByRole('heading', { name: 'Guía para todos' })).toBeInTheDocument();
    expect(document.querySelector('link[data-type-lab][rel="stylesheet"]')).toHaveAttribute(
      'href',
      expect.stringContaining('Fraunces'),
    );
  });

  it('cambia la vista previa al elegir otra dirección', () => {
    renderWithProviders(<TypographyLab />, { route: '/tipografia' });

    fireEvent.click(screen.getByRole('button', { name: 'Cuaderno botánico' }));

    expect(screen.getByRole('heading', { name: 'Cuaderno botánico' })).toBeInTheDocument();
    const preview = screen.getByRole('region', { name: 'Vista previa' });
    const title = within(preview).getByRole('heading', { name: 'Jacaranda mimosifolia' });

    expect(title.style.fontFamily).toContain('Alegreya');
  });
});
