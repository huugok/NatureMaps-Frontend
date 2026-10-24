import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { TabLayout } from './TabLayout'

function renderAt(route: string) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route element={<TabLayout />}>
          <Route path="/mapa" element={<p>Pantalla mapa</p>} />
          <Route path="/rutas" element={<p>Pantalla rutas</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('TabLayout', () => {
  it('muestra la pantalla y marca la pestaña activa', () => {
    renderAt('/mapa')
    expect(screen.getByText('Pantalla mapa')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /ver mapa/i })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', 'tab-mapa')
  })

  it('al pulsar otra pestaña navega a su ruta', () => {
    renderAt('/mapa')
    fireEvent.click(screen.getByRole('tab', { name: /ver rutas/i }))
    expect(screen.getByText('Pantalla rutas')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /ver rutas/i })).toHaveAttribute('aria-selected', 'true')
  })
})
