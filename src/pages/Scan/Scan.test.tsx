import { screen } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../test/renderWithProviders'
import { Scan } from './Scan'

function renderScan() {
  return renderWithProviders(
    <Routes>
      <Route path="/" element={<Scan />} />
      <Route path="/permiso-camara" element={<p>Pantalla permiso</p>} />
    </Routes>,
  )
}

describe('Scan', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => vi.unstubAllGlobals())

  it('sin cámara ofrece elegir una foto de la galería', () => {
    renderScan()
    expect(screen.getByText(/cámara no disponible/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Galería' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Hacer foto' })).not.toBeInTheDocument()
  })

  it('la primera vez con cámara pasa por la pantalla de permiso', () => {
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: vi.fn() } })
    renderScan()
    expect(screen.getByText('Pantalla permiso')).toBeInTheDocument()
  })

  it('si ya se decidió el permiso muestra el visor y el disparador', () => {
    localStorage.setItem('naturemaps:camera-permission-seen', '1')
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: vi.fn().mockReturnValue(new Promise(() => {})) } })
    renderScan()
    expect(screen.getByRole('button', { name: 'Hacer foto' })).toBeInTheDocument()
  })
})
