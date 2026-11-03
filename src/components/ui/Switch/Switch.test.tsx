import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Switch } from './Switch'

describe('Switch', () => {
  it('expone role switch y su estado', () => {
    render(<Switch checked label="Avisos" onChange={() => {}} />)
    expect(screen.getByRole('switch', { name: 'Avisos' })).toHaveAttribute('aria-checked', 'true')
  })

  it('al pulsar pide el valor contrario', () => {
    const onChange = vi.fn()
    render(<Switch checked={false} label="Avisos" onChange={onChange} />)
    fireEvent.click(screen.getByRole('switch', { name: 'Avisos' }))
    expect(onChange).toHaveBeenCalledWith(true)
  })
})
