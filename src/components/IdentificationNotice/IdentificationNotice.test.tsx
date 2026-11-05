import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppProvider } from '../../context/AppContext';
import { LANGUAGE_STORAGE_KEY } from '../../services/languagePreference';
import { IdentificationNotice } from './IdentificationNotice';
import es from './locales/es.json';
import va from './locales/va.json';
import en from './locales/en.json';

describe('IdentificationNotice — UT 932', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('PA 653: explica la falta de Internet cuando el navegador está offline', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    render(<IdentificationNotice failure={{ code: 'unreachable' }} />);

    expect(screen.getByRole('status')).toHaveTextContent('Sin conexión a Internet');
    expect(screen.getByText(/Conéctate a Internet y pulsa Reintentar/)).toBeInTheDocument();
  });

  it('no atribuye al dispositivo el fallo de un servidor cuando está online', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    render(<IdentificationNotice failure={{ code: 'unreachable' }} />);

    expect(screen.getByRole('heading', { name: 'Sin conexión con el servidor' })).toBeInTheDocument();
    expect(screen.queryByText('Sin conexión a Internet')).not.toBeInTheDocument();
  });

  it.each([
    ['es', 'Límite diario alcanzado'],
    ['va', 'Límit diari assolit'],
    ['en', 'Daily limit reached'],
  ] as const)('PA 655: traduce la cuota agotada a %s', (language, heading) => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    render(<AppProvider><IdentificationNotice failure={{ code: 'request', status: 429 }} /></AppProvider>);

    expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('500');
  });

  it('distingue una caída de Pl@ntNet de la falta de Internet del dispositivo', () => {
    render(<IdentificationNotice failure={{ code: 'request', status: 504 }} />);
    expect(screen.getByRole('heading', { name: 'Servicio de identificación no disponible' })).toBeInTheDocument();
    expect(screen.queryByText('Sin conexión a Internet')).not.toBeInTheDocument();
  });

  it('mantiene las mismas claves y variables en los tres JSON', () => {
    for (const dictionary of [es, va, en]) {
      expect(Object.keys(dictionary).sort()).toEqual(Object.keys(es).sort());
      expect(Object.values(dictionary).every(text => text.trim().length > 0)).toBe(true);
      expect(dictionary.httpError.match(/\{\w+\}/g)).toEqual(['{status}']);
    }
  });
});
