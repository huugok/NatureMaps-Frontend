import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StatusDot } from './StatusDot'

describe('StatusDot', () => {
  it('muestra el texto y expone el estado', () => {
    render(<StatusDot status="error">Sin conexión</StatusDot>)
    expect(screen.getByText('Sin conexión')).toHaveAttribute('data-status', 'error')
  })
})
