import { screen } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { renderWithProviders } from '../../test/renderWithProviders'
import { Home } from './Home'

function renderHome() {
  return renderWithProviders(
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/modo" element={<p>Elegir modo</p>} />
    </Routes>,
  )
}

describe('Home', () => {
  beforeEach(() => localStorage.clear())

  it('sin modo elegido redirige a la selección de modo', () => {
    renderHome()
    expect(screen.getByText('Elegir modo')).toBeInTheDocument()
  })

  it('con modo muestra su nombre y los accesos', () => {
    localStorage.setItem('naturemaps:prefs', JSON.stringify({ mode: 'aventura' }))
    renderHome()
    expect(screen.getByText('MODO AVENTURA')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /identificar una planta/i })).toHaveAttribute('href', '/escanear')
    expect(screen.getByRole('link', { name: /ver el mapa/i })).toHaveAttribute('href', '/mapa')
    expect(screen.getByRole('link', { name: /explorar rutas/i })).toHaveAttribute('href', '/rutas')
    expect(screen.getByRole('link', { name: /ficha de planta/i })).toHaveAttribute('href', '/ficha')
  })
})
