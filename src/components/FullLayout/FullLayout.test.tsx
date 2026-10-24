import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { FullLayout } from './FullLayout'

describe('FullLayout', () => {
  it('muestra la pantalla sin barra inferior', () => {
    render(
      <MemoryRouter initialEntries={['/ajustes']}>
        <Routes>
          <Route element={<FullLayout />}>
            <Route path="/ajustes" element={<p>Pantalla ajustes</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByRole('main')).toHaveTextContent('Pantalla ajustes')
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
  })
})
