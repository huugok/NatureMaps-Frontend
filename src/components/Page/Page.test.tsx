import { fireEvent, screen } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '../../test/renderWithProviders'
import { Page } from './Page'

describe('Page', () => {
  it('muestra título, subtítulo y contenido', () => {
    renderWithProviders(
      <Page title="Rutas" subtitle="Cerca de ti">
        <p>Cuerpo</p>
      </Page>,
    )
    expect(screen.getByRole('heading', { name: 'Rutas' })).toBeInTheDocument()
    expect(screen.getByText('Cerca de ti')).toBeInTheDocument()
    expect(screen.getByText('Cuerpo')).toBeInTheDocument()
  })

  it('sin "back" no hay botón de volver', () => {
    renderWithProviders(<Page title="Inicio">x</Page>)
    expect(screen.queryByRole('button', { name: 'Volver' })).not.toBeInTheDocument()
  })

  it('con "back" vuelve a la pantalla anterior', () => {
    renderWithProviders(
      <Routes>
        <Route path="/a" element={<p>Pantalla A</p>} />
        <Route
          path="/b"
          element={
            <Page title="B" back>
              x
            </Page>
          }
        />
      </Routes>,
      { entries: ['/a', '/b'], index: 1 },
    )
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }))
    expect(screen.getByText('Pantalla A')).toBeInTheDocument()
  })
})
