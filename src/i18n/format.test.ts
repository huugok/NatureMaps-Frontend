import { describe, expect, it } from 'vitest'
import { formatDistance, formatDuration } from './format'

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

describe('formatDuration', () => {
  it('muestra minutos por debajo de una hora', () => {
    expect(formatDuration(0, 'es')).toBe('0 min')
    expect(formatDuration(1740, 'es')).toBe('29 min')
    expect(formatDuration(3540, 'es')).toBe('59 min')
  })

  it('pasa a horas y minutos a partir de una hora', () => {
    expect(formatDuration(3600, 'es')).toBe('1 h')
    expect(formatDuration(4500, 'es')).toBe('1 h 15 min')
    expect(formatDuration(7680, 'es')).toBe('2 h 8 min')
  })

  it('formatea los números según el idioma activo', () => {
    expect(formatDuration(4500, 'en')).toBe('1 h 15 min')
    expect(formatDuration(4500, 'va')).toBe('1 h 15 min')
  })
})
