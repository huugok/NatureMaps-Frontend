import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Card } from './Card'

describe('Card', () => {
  it('muestra su contenido y respeta className', () => {
    render(<Card className="extra">Contenido</Card>)
    expect(screen.getByText('Contenido')).toHaveClass('extra')
  })

  it('la variante accent no lleva borde', () => {
    render(<Card variant="accent">Destacada</Card>)
    expect(screen.getByText('Destacada')).not.toHaveClass('border')
  })
})
