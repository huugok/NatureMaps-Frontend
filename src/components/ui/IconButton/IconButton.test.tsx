import { fireEvent, render, screen } from '@testing-library/react'
import { ArrowLeft } from 'lucide-react'
import { describe, expect, it, vi } from 'vitest'
import { IconButton } from './IconButton'

describe('IconButton', () => {
  it('usa label como nombre accesible', () => {
    render(<IconButton icon={ArrowLeft} label="Volver" />)
    expect(screen.getByRole('button', { name: 'Volver' })).toBeInTheDocument()
  })

  it('llama a onClick', () => {
    const onClick = vi.fn()
    render(<IconButton icon={ArrowLeft} label="Volver" onClick={onClick} />)
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
