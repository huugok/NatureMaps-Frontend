import { afterEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppProvider } from '../../context/AppContext';
import { saveLanguagePreference } from '../../services/languagePreference';
import type { SourceReference } from '../../types/sourceReference';
import { SourceMetadata } from './SourceMetadata';
import es from './locales/es.json';
import va from './locales/va.json';
import en from './locales/en.json';

const source: SourceReference = {
  name: 'Inventario', provider: 'Ajuntament de València', url: 'https://geoportal.valencia.es/x',
  date: '2026-10-31T23:59:59Z', dateType: 'imported', version: null, scope: 'inventory', description: '',
};

afterEach(() => localStorage.clear());

describe('SourceMetadata — UT 924', () => {
  it.each([
    ['es', 'Entidad responsable', 'Última importación'],
    ['va', 'Entitat responsable', 'Última importació'],
    ['en', 'Responsible entity', 'Latest import'],
  ] as const)('muestra entidad y significado de la fecha en %s', (language, provider, dateLabel) => {
    saveLanguagePreference(language);
    render(<AppProvider><SourceMetadata source={source} /></AppProvider>);
    expect(screen.getByText(`${provider}: Ajuntament de València`)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(dateLabel))).toBeInTheDocument();
    const time = document.querySelector('time');
    expect(time).toHaveAttribute('datetime', source.date);
    expect(time?.textContent).toContain('31'); // UTC: no shift into November in local time.
  });

  it('distingue consulta de importación y conserva la fecha original', () => {
    render(<SourceMetadata source={{ ...source, scope: 'editorial', dateType: 'consulted' }} />);
    expect(screen.getByText(/Consulta:/)).toBeInTheDocument();
    expect(screen.queryByText(/Última importación/)).not.toBeInTheDocument();
  });

  it('admite una versión sin inventar fechas', () => {
    render(<SourceMetadata source={{ ...source, date: null, dateType: null, version: '2.0' }} />);
    expect(screen.getByText('Versión: 2.0')).toBeInTheDocument();
    expect(document.querySelector('time')).toBeNull();
    expect(screen.queryByText('Fecha o versión no disponible')).not.toBeInTheDocument();
  });

  it('señala metadatos desconocidos y tolera fechas inválidas', () => {
    render(<SourceMetadata source={{ ...source, date: 'invalid', provider: null }} />);
    expect(screen.getByText('Entidad responsable: No consta')).toBeInTheDocument();
    expect(screen.getByText('Fecha o versión no disponible')).toBeInTheDocument();
  });

  it('mantiene la compatibilidad con fuentes antiguas y paridad de las traducciones', () => {
    const { container } = render(<SourceMetadata />);
    expect(container).toBeEmptyDOMElement();
    expect(Object.keys(va).sort()).toEqual(Object.keys(es).sort());
    expect(Object.keys(en).sort()).toEqual(Object.keys(es).sort());
  });
});
