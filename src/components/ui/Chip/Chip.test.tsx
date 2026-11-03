import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Chip } from './Chip'

describe('Chip', () => {
  it('refleja el estado activo con aria-pressed', () => {
    render(<Chip active>Árboles</Chip>)
    expect(screen.getByRole('button', { name: 'Árboles' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('llama a onClick', () => {
    const onClick = vi.fn()
    render(<Chip onClick={onClick}>Arbustos</Chip>)
    fireEvent.click(screen.getByRole('button', { name: 'Arbustos' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
