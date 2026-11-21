import { describe, expect, it } from 'vitest'
import { formatBytes, formatDate, formatPercent, formatArea, formatCount, formatDistance } from './format'

describe('formatDistance', () => {
  it('muestra metros por debajo del kilómetro', () => {
    expect(formatDistance(0, 'es')).toBe('0 m')
    expect(formatDistance(250, 'es')).toBe('250 m')
    expect(formatDistance(999, 'es')).toBe('999 m')
  })

  it('pasa a kilómetros con un decimal a partir de 1000', () => {
    expect(formatDistance(1000, 'es')).toBe('1 km')
    expect(formatDistance(1420, 'es')).toBe('1,4 km')
    expect(formatDistance(2500, 'es')).toBe('2,5 km')
  })

  it('formatea los números según el idioma activo', () => {
    expect(formatDistance(250, 'en')).toBe('250 m')
    expect(formatDistance(1420, 'en')).toBe('1.4 km')
    expect(formatDistance(2500, 'va')).toBe('2,5 km')
  })
})

describe('formatArea', () => {
  it('muestra metros cuadrados por debajo de la hectárea y hectáreas a partir de ella', () => {
    // En español los números de cuatro cifras no llevan separador de miles.
    expect(formatArea(4341.6, 'es')).toBe('4342 m²')
    expect(formatArea(4341.6, 'en')).toBe('4,342 m²')
    expect(formatArea(10000, 'es')).toBe('1 ha')
    expect(formatArea(172833.7, 'es')).toBe('17,3 ha')
    expect(formatArea(172833.7, 'en')).toBe('17.3 ha')
  })
})

describe('formatCount', () => {
  it('usa el separador de miles del idioma', () => {
    expect(formatCount(12661, 'es')).toBe('12.661')
    expect(formatCount(12661, 'en')).toBe('12,661')
    expect(formatCount(7, 'va')).toBe('7')
  })
})

describe('formatBytes', () => {
  it('usa kilobytes por debajo de 1 MB y megabytes a partir de él', () => {
    expect(formatBytes(400, 'es')).toBe('1 KB')
    expect(formatBytes(250_000, 'es')).toBe('250 KB')
    expect(formatBytes(1_500_000, 'es')).toBe('1,5 MB')
    expect(formatBytes(1_500_000, 'en')).toBe('1.5 MB')
  })
})

describe('formatPercent', () => {
  it('redondea a enteros', () => {
    expect(formatPercent(0.424, 'en')).toBe('42%')
    expect(formatPercent(1, 'en')).toBe('100%')
  })
})

describe('formatDate', () => {
  it('escribe la fecha en el idioma activo', () => {
    expect(formatDate('2026-11-15T10:00:00Z', 'en')).toBe('15 Nov 2026')
    expect(formatDate('2026-11-15T10:00:00Z', 'es')).toContain('2026')
  })
})
