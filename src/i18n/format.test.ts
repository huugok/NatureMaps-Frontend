import { describe, expect, it } from 'vitest'
import { formatDistance } from './format'

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
