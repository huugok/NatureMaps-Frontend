import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import App from './App';

const renderApp = () => render(<App />);

describe('ficha de planta (RF3)', () => {
  it('mantiene las cinco pestañas de la navegación inferior', () => {
    renderApp();

    expect(screen.getAllByRole('tab')).toHaveLength(5);
  });

  it('abre la ficha desde las pestañas y vuelve a las pestañas', () => {
    renderApp();

    fireEvent.click(screen.getByRole('button', { name: /ficha de planta/i }));

    expect(
      screen.getByRole('heading', { level: 1, name: 'Jacaranda mimosifolia' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ver en el mapa/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));

    expect(screen.getByRole('button', { name: /ficha de planta/i })).toBeInTheDocument();
  });
});
