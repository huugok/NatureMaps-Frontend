import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Badge } from './Badge'

describe('Badge', () => {
  it('muestra su contenido', () => {
    render(<Badge>Nuevo</Badge>)
    expect(screen.getByText('Nuevo')).toBeInTheDocument()
  })

  it('la variante sólida usa el color de acento', () => {
    render(<Badge solid>Sólida</Badge>)
    expect(screen.getByText('Sólida')).toHaveClass('bg-accent')
  })
})
