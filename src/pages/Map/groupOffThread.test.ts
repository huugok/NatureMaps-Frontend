import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PlantPin } from '../../types/plant'
import { groupOffThread } from './groupOffThread'

const pins: PlantPin[] = [
  { id: 1, displayName: 'Almez', latitude: 39.47, longitude: -0.37, identified: true, speciesId: 3, distance: 10 },
  { id: 2, displayName: 'Almez', latitude: 39.4701, longitude: -0.37, identified: true, speciesId: 3, distance: 12 },
  { id: 3, displayName: 'Olivo', latitude: 39.48, longitude: -0.38, identified: true, speciesId: 4, distance: 50 },
]

describe('groupOffThread', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('sin Worker agrupa directamente como antes', async () => {
    const result = await groupOffThread(pins)
    expect(result.pins.some((pin) => pin.count === 2)).toBe(true)
    expect(result.areasById.size).toBe(1)
  })

  it('si el Worker falla al crearse, agrupa directamente y la carga sigue', async () => {
    vi.stubGlobal('Worker', class {
      constructor() { throw new Error('worker prohibido') }
    })
    vi.resetModules()
    const { groupOffThread: fresh } = await import('./groupOffThread')
    const result = await fresh(pins)
    expect(result.pins.some((pin) => pin.count === 2)).toBe(true)
    expect(result.areaByMemberId.size).toBe(2)
  })
})
