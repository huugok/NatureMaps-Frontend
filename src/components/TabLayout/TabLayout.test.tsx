import { fireEvent, screen } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { LANG_KEY } from '../../context/AppContext'
import { renderWithProviders } from '../../test/renderWithProviders'
import { TabLayout } from './TabLayout'

function renderAt(route: string) {
  return renderWithProviders(
    <Routes>
      <Route element={<TabLayout />}>
        <Route path="/mapa" element={<p>Pantalla mapa</p>} />
        <Route path="/rutas" element={<p>Pantalla rutas</p>} />
      </Route>
    </Routes>,
    { route },
  )
}

describe('TabLayout', () => {
  beforeEach(() => localStorage.clear())

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

  it('la barra inferior también se traduce', () => {
    localStorage.setItem(LANG_KEY, 'en')
    renderAt('/mapa')
    expect(screen.getByRole('navigation', { name: 'Main navigation bar' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'View map of species and trees' })).toHaveTextContent('Map')
    expect(screen.getByRole('tab', { name: 'View botanical and cultural routes' })).toHaveTextContent('Routes')
  })
})
