import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/renderWithProviders';
import { OfflineSavedToast, SAVED_TOAST_MS } from './OfflineSavedToast';

describe('aviso de zona descargada', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('dice qué parque se ha descargado y enlaza con Rutas', () => {
    renderWithProviders(<OfflineSavedToast name="Jardín de las Hespérides" onClose={() => {}} />);
    expect(screen.getByRole('status')).toHaveTextContent('Parque descargado: Jardín de las Hespérides. Ya puedes usarlo sin conexión.');
    expect(screen.getByRole('link', { name: 'Verlo en Rutas' })).toHaveAttribute('href', '/rutas');
  });

  it('desaparece solo a los 20 segundos, ni antes ni después', () => {
    const onClose = vi.fn();
    renderWithProviders(<OfflineSavedToast name="Turia" onClose={onClose} />);
    expect(SAVED_TOAST_MS).toBe(20_000);
    act(() => vi.advanceTimersByTime(19_999));
    expect(onClose).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('se puede cerrar antes con el botón', async () => {
    vi.useRealTimers();
    const onClose = vi.fn();
    renderWithProviders(<OfflineSavedToast name="Turia" onClose={onClose} />);
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar aviso' }));
    expect(onClose).toHaveBeenCalled();
  });
});
