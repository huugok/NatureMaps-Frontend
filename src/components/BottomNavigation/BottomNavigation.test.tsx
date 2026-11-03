import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { BottomNavigation } from './BottomNavigation';
import type { TabId } from '../../types/navigation';

describe('BottomNavigation Component', () => {
  it('renders all 5 standard navigation tabs', () => {
    const { container } = render(<BottomNavigation activeTab="mapa" />);

    expect(screen.getByRole('tab', { name: /ir a inicio/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /ver mapa/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /escanear/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /ver rutas/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /buscar especies/i })).toBeInTheDocument();
    expect(container.querySelector('nav')).toHaveClass('pb-[env(safe-area-inset-bottom,0px)]');
    expect(screen.getByRole('tablist')).toHaveClass('h-[62px]');
    expect(screen.getByRole('tablist')).not.toHaveClass('pb-[env(safe-area-inset-bottom,0px)]');
  });

  it('highlights the active tab with aria-selected="true"', () => {
    render(<BottomNavigation activeTab="mapa" />);

    const mapaTab = screen.getByRole('tab', { name: /ver mapa/i });
    expect(mapaTab).toHaveAttribute('aria-selected', 'true');
    expect(mapaTab).toHaveAttribute('tabindex', '0');

    const inicioTab = screen.getByRole('tab', { name: /ir a inicio/i });
    expect(inicioTab).toHaveAttribute('aria-selected', 'false');
    expect(inicioTab).toHaveAttribute('tabindex', '-1');
  });

  it('triggers onChange callback when clicking another tab', () => {
    const handleChange = vi.fn();
    render(<BottomNavigation activeTab="mapa" onChange={handleChange} />);

    const routesTab = screen.getByRole('tab', { name: /ver rutas/i });
    fireEvent.click(routesTab);

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange).toHaveBeenCalledWith('rutas');
  });

  it('supports uncontrolled state with defaultTab', () => {
    render(<BottomNavigation defaultTab="inicio" />);

    const inicioTab = screen.getByRole('tab', { name: /ir a inicio/i });
    expect(inicioTab).toHaveAttribute('aria-selected', 'true');

    const buscarTab = screen.getByRole('tab', { name: /buscar especies/i });
    fireEvent.click(buscarTab);
    expect(buscarTab).toHaveAttribute('aria-selected', 'true');
    expect(inicioTab).toHaveAttribute('aria-selected', 'false');
  });

  it('supports keyboard navigation via ArrowRight and ArrowLeft', () => {
    let currentTab: TabId = 'mapa';
    const handleChange = vi.fn((tab: TabId) => {
      currentTab = tab;
    });

    const { rerender } = render(<BottomNavigation activeTab={currentTab} onChange={handleChange} />);

    const mapaTab = screen.getByRole('tab', { name: /ver mapa/i });
    mapaTab.focus();

    // Right arrow -> should select 'escanear'
    fireEvent.keyDown(mapaTab, { key: 'ArrowRight' });
    expect(handleChange).toHaveBeenCalledWith('escanear');

    rerender(<BottomNavigation activeTab="escanear" onChange={handleChange} />);
    const escanearTab = screen.getByRole('tab', { name: /escanear/i });

    // Left arrow -> should go back to 'mapa'
    fireEvent.keyDown(escanearTab, { key: 'ArrowLeft' });
    expect(handleChange).toHaveBeenCalledWith('mapa');
  });
});
