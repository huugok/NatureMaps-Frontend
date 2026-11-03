import { fireEvent, screen } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { renderWithProviders } from '../../test/renderWithProviders'
import { ModeSelect } from './ModeSelect'

function renderModeSelect() {
  return renderWithProviders(
    <Routes>
      <Route path="/" element={<ModeSelect />} />
      <Route path="/inicio" element={<p>Pantalla de inicio</p>} />
    </Routes>,
  )
}

describe('ModeSelect', () => {
  beforeEach(() => {
    localStorage.clear()
    delete document.documentElement.dataset.mode
  })

  it('ofrece los cuatro modos', () => {
    renderModeSelect()
    expect(screen.getAllByRole('button')).toHaveLength(4)
  })

  it('al elegir uno lo guarda, cambia el acento y va al inicio', () => {
    renderModeSelect()
    fireEvent.click(screen.getByRole('button', { name: /modo aventura/i }))
    expect(screen.getByText('Pantalla de inicio')).toBeInTheDocument()
    expect(document.documentElement.dataset.mode).toBe('aventura')
    expect(JSON.parse(localStorage.getItem('naturemaps:prefs')!)).toEqual({ mode: 'aventura' })
  })
})
