import { fireEvent, screen, waitFor } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../test/renderWithProviders'
import { PermisoCamara } from './PermisoCamara'

function renderPermiso() {
  return renderWithProviders(
    <Routes>
      <Route path="/" element={<PermisoCamara />} />
      <Route path="/escanear" element={<p>Pantalla escanear</p>} />
      <Route path="/inicio" element={<p>Pantalla inicio</p>} />
    </Routes>,
  )
}

describe('PermisoCamara', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => vi.unstubAllGlobals())

  it('explica por qué se necesita la cámara', () => {
    renderPermiso()
    expect(screen.getByText('Permiso de cámara')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Permitir la cámara' })).toBeInTheDocument()
  })

  it('"Ahora no" vuelve al inicio', () => {
    renderPermiso()
    fireEvent.click(screen.getByRole('button', { name: 'Ahora no' }))
    expect(screen.getByText('Pantalla inicio')).toBeInTheDocument()
  })

  it('si se concede el permiso pasa a escanear y lo recuerda', async () => {
    const stop = vi.fn()
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop }] }) } })
    renderPermiso()
    fireEvent.click(screen.getByRole('button', { name: 'Permitir la cámara' }))
    await waitFor(() => expect(screen.getByText('Pantalla escanear')).toBeInTheDocument())
    expect(stop).toHaveBeenCalled()
    expect(localStorage.getItem('naturemaps:camera-permission-seen')).toBe('1')
  })

  it('si se deniega muestra el aviso y permite continuar', async () => {
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: vi.fn().mockRejectedValue(new Error('denied')) } })
    renderPermiso()
    fireEvent.click(screen.getByRole('button', { name: 'Permitir la cámara' }))
    expect(await screen.findByText(/no has dado permiso/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeInTheDocument()
  })
})
