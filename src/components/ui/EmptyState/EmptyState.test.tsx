import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { EmptyState } from './EmptyState'

describe('EmptyState', () => {
  it('muestra título, descripción y acción', () => {
    render(<EmptyState title="Sin datos" description="Vuelve más tarde" action={<button>Reintentar</button>} />)
    expect(screen.getByText('Sin datos')).toBeInTheDocument()
    expect(screen.getByText('Vuelve más tarde')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })

  it('la descripción y la acción son opcionales', () => {
    render(<EmptyState title="Vacío" />)
    expect(screen.getByText('Vacío')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
