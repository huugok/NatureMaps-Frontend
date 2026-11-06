import { describe, expect, it } from 'vitest';
import { commonNameFor, fichaDesdeItemLista } from './ficha';

describe('nombres del inventario con codificación dañada', () => {
  it('elige Canària en vez del duplicado CanÃ ria para el valenciano', () => {
    expect(commonNameFor([
      { name: 'Palmera Can\u00C3 ria', language: 'ca' },
      { name: 'Palmera Canària', language: 'ca' },
      { name: 'Palmera canaria', language: 'es' },
    ], 'va')).toBe('Palmera Canària');
  });

  it('usa otro idioma disponible si el preferido solo tiene texto dañado', () => {
    expect(commonNameFor([
      { name: 'Palmera Can\u00C3\u00A0ria', language: 'ca' },
      { name: 'Palmera canaria', language: 'es' },
    ], 'va')).toBe('Palmera canaria');
  });

  it('conserva las tildes y caracteres válidos', () => {
    for (const name of ['Palmera Canària', 'Pi pinyoner', 'Árbol', 'São Tomé', 'Ãgua', 'Âncora']) {
      expect(commonNameFor([{ name, language: 'ca' }], 'va')).toBe(name);
    }
  });

  it('usa el científico si todos los nombres están dañados', () => {
    const species = fichaDesdeItemLista({
      id: 1, scientificName: 'Phoenix canariensis',
      names: [{ name: 'Palmera Can\uFFFD ria', language: 'ca' }],
      content: null, profile: null, enrichment: null, image: null,
    }, 'va');
    expect(species.commonName).toBe('Phoenix canariensis');
  });
});
