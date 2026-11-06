import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FichaPlantaPage } from '../pages/FichaPlanta/FichaPlantaPage';
import { fichaDesdeItemLista } from './ficha';
import type { FichaListItem } from './ficha';
import { sourceReferencesForView } from './sourceReferences';
import type { SourceReference } from '../types/sourceReference';

const reference: SourceReference = {
  name: 'Arbolado — Arbratge', provider: 'Ajuntament de València',
  url: 'https://opendata.vlci.valencia.es/es/dataset/arbratge-arbolado',
  date: '2026-10-31', dateType: 'imported', version: null, scope: 'inventory',
  description: 'Créditos originales',
};
const item: FichaListItem = {
  id: 1, scientificName: 'Citrus aurantium', names: [], content: null,
  profile: null, enrichment: null, image: null,
};

describe('API → ficha → fuentes (UT 924)', () => {
  it('una especie sin texto conserva la fuente del inventario con entidad, fecha y enlace', () => {
    const species = fichaDesdeItemLista({ ...item, provenance: [reference] }, 'es');
    render(<FichaPlantaPage species={species} />);
    expect(screen.getByText('Arbolado — Arbratge')).toBeInTheDocument();
    expect(screen.getByText('Entidad responsable: Ajuntament de València')).toBeInTheDocument();
    expect(screen.getByText('Créditos originales')).toBeInTheDocument();
    expect(document.querySelector('time')).toHaveAttribute('datetime', '2026-10-31');
    const link = screen.getByRole('link', { name: reference.url });
    expect(link).toHaveAttribute('href', reference.url);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('conserva la autoría de la foto y todas las referencias con nombres repetidos', () => {
    const image: SourceReference = { ...reference, name: 'Wikipedia', scope: 'image',
      url: 'https://commons.wikimedia.org/wiki/File:Citrus.jpg', description: 'Fotógrafo · CC BY-SA 4.0' };
    const result = fichaDesdeItemLista({ ...item, provenance: [reference, image], image: {
      url: 'https://upload.wikimedia.org/example.jpg', sourceUrl: image.url, author: 'Fotógrafo',
      license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
      attribution: image.description,
    } }, 'es');
    expect(result.sources).toHaveLength(2);
    expect(result.sources?.[1].description).toBe(image.description);
    expect(result.photoCredit).toBe(image.description);
  });

  it('una API anterior sigue mostrando sus fuentes editoriales', () => {
    const legacy = { name: 'Wikipedia', description: 'CC BY-SA', url: 'https://es.wikipedia.org/wiki/Citrus' };
    const result = fichaDesdeItemLista({ ...item, profile: {
      language: 'es', description: 'Texto', family: null, flowering: null, curiosity: null, sources: [legacy],
    } }, 'es');
    expect(result.sources).toEqual([{ ...legacy, icon: 'search' }]);
    expect(sourceReferencesForView([])).toEqual({});
  });

  it('no convierte URLs ejecutables o malformadas en enlaces de fuentes', () => {
    expect(sourceReferencesForView([
      { ...reference, url: 'javascript:alert(1)' }, { ...reference, url: 'not-a-url' }, reference,
    ]).sources).toHaveLength(1);
  });
});
