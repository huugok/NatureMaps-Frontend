import { fireEvent, render, screen } from '@testing-library/react'
import { Search } from 'lucide-react'
import { describe, expect, it, vi } from 'vitest'
import { Input } from './Input'

describe('Input', () => {
  it('muestra el placeholder y avisa de los cambios', () => {
    const onChange = vi.fn()
    render(<Input icon={Search} placeholder="Buscar…" onChange={onChange} />)
    fireEvent.change(screen.getByPlaceholderText('Buscar…'), { target: { value: 'olivo' } })
    expect(onChange).toHaveBeenCalledTimes(1)
  })
})
