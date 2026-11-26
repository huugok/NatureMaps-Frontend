import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '../../test/renderWithProviders'
import { PermissionsSettings } from './PermissionsSettings'

describe('PermissionsSettings', () => {
  it('muestra los tres permisos y su explicación', () => {
    renderWithProviders(<PermissionsSettings onBack={() => undefined} />)

    expect(screen.getByRole('heading', { name: 'Permisos' })).toBeInTheDocument()
    expect(screen.getByText('Ubicación')).toBeInTheDocument()
    expect(screen.getByText('Para mostrarte tu posición y guiarte en las rutas.')).toBeInTheDocument()
    expect(screen.getByText('Cámara')).toBeInTheDocument()
    expect(screen.getByText('Para identificar plantas con una foto.')).toBeInTheDocument()
    expect(screen.getByText('Notificaciones')).toBeInTheDocument()
    expect(screen.getByText('Para avisarte de las plantas en flor de la temporada.')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Conceder permiso' })).toHaveLength(3)
  })
})
