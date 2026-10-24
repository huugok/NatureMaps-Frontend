import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { Page } from './Page'

describe('Page', () => {
  it('muestra título, subtítulo y contenido', () => {
    render(
      <MemoryRouter>
        <Page title="Rutas" subtitle="Cerca de ti">
          <p>Cuerpo</p>
        </Page>
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { name: 'Rutas' })).toBeInTheDocument()
    expect(screen.getByText('Cerca de ti')).toBeInTheDocument()
    expect(screen.getByText('Cuerpo')).toBeInTheDocument()
  })

  it('sin "back" no hay botón de volver', () => {
    render(
      <MemoryRouter>
        <Page title="Inicio">x</Page>
      </MemoryRouter>,
    )
    expect(screen.queryByRole('button', { name: 'Volver' })).not.toBeInTheDocument()
  })

  it('con "back" vuelve a la pantalla anterior', () => {
    render(
      <MemoryRouter initialEntries={['/a', '/b']} initialIndex={1}>
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
        </Routes>
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }))
    expect(screen.getByText('Pantalla A')).toBeInTheDocument()
  })
})
