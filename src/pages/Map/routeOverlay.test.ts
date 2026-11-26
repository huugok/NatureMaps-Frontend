import { describe, expect, it } from 'vitest'
import { createNumberedStopIcon } from './routeOverlay'
import type { RouteStop } from '../../services/routes'

const base: RouteStop = {
  kind: 'poi', id: 1, name: 'Museo', latitude: 39.47, longitude: -0.37, speciesId: null,
}

function htmlOf(icon: ReturnType<typeof createNumberedStopIcon>): HTMLElement {
  return icon.options.html as HTMLElement
}

describe('createNumberedStopIcon', () => {
  it('numera cada parada en orden secuencial', () => {
    expect(htmlOf(createNumberedStopIcon(base, 0)).querySelector('.route-stop__number')?.textContent).toBe('1')
    expect(htmlOf(createNumberedStopIcon(base, 3)).querySelector('.route-stop__number')?.textContent).toBe('4')
  })

  it('el distintivo de patrocinio aparece solo en las paradas sponsor', () => {
    expect(htmlOf(createNumberedStopIcon(base, 1)).querySelector('.route-stop__sponsor')).toBeNull()
    const sponsor = createNumberedStopIcon({ ...base, kind: 'sponsor', businessName: 'Comercio' }, 2)
    expect(htmlOf(sponsor).querySelector('.route-stop__sponsor')?.textContent).toBe('★')
    expect(htmlOf(sponsor).querySelector('.route-stop__number')?.textContent).toBe('3')
  })
})
