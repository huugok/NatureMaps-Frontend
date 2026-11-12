import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MAX_SPECIES_PHOTOS,
  SPECIES_PHOTO_STORAGE_KEY,
  getSpeciesPhoto,
  saveSpeciesPhoto,
  speciesPhotoKey,
} from './speciesPhoto';

const jacaranda = { scientificName: 'Jacaranda mimosifolia' };
const foto = 'data:image/jpeg;base64,Zm90bw==';

describe('foto propia de la especie (PA 2941)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('guarda la foto y la devuelve al abrir la ficha de la especie', () => {
    expect(getSpeciesPhoto(jacaranda)).toBeNull();

    expect(saveSpeciesPhoto(jacaranda, foto)).toBe(true);
    expect(getSpeciesPhoto(jacaranda)).toBe(foto);
    expect(localStorage.getItem(SPECIES_PHOTO_STORAGE_KEY)).toContain(foto);
  });

  it('encuentra la foto aunque el nombre científico cambie de notación', () => {
    saveSpeciesPhoto({ scientificName: 'Citrus × aurantium' }, foto);

    expect(getSpeciesPhoto({ scientificName: 'Citrus x aurantium' })).toBe(foto);
    expect(getSpeciesPhoto({ scientificName: 'CITRUS  X  AURANTIUM' })).toBe(foto);
    expect(speciesPhotoKey({ scientificName: 'Citrus × aurantium' })).toBe(
      speciesPhotoKey({ scientificName: 'Citrus x aurantium' }),
    );
  });

  it('descarta las fotos más antiguas al llegar al máximo', () => {
    for (let i = 0; i <= MAX_SPECIES_PHOTOS; i += 1) {
      vi.setSystemTime(new Date(2026, 0, 1, 0, 0, i));
      saveSpeciesPhoto({ scientificName: `Especie ${i}` }, `data:image/jpeg;base64,${i}`);
    }

    expect(getSpeciesPhoto({ scientificName: 'Especie 0' })).toBeNull();
    expect(getSpeciesPhoto({ scientificName: `Especie ${MAX_SPECIES_PHOTOS}` })).toBe(
      `data:image/jpeg;base64,${MAX_SPECIES_PHOTOS}`,
    );
  });

  it('no promete persistencia cuando el dispositivo no puede guardar', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Cuota llena', 'QuotaExceededError');
    });

    expect(saveSpeciesPhoto(jacaranda, foto)).toBe(false);
    expect(getSpeciesPhoto(jacaranda)).toBeNull();
  });

  it('sobrevive a un almacenamiento corrupto', () => {
    localStorage.setItem(SPECIES_PHOTO_STORAGE_KEY, 'no-es-json');

    expect(getSpeciesPhoto(jacaranda)).toBeNull();
    expect(saveSpeciesPhoto(jacaranda, foto)).toBe(true);
    expect(getSpeciesPhoto(jacaranda)).toBe(foto);
  });
});
