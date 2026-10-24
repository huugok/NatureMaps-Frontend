import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Radio } from './Radio'

describe('Radio', () => {
  it('es decorativo y refleja si está marcado', () => {
    const { container, rerender } = render(<Radio checked={false} />)
    const dot = container.firstElementChild
    expect(dot).toHaveAttribute('aria-hidden', 'true')
    expect(dot).toHaveAttribute('data-checked', 'false')
    rerender(<Radio checked />)
    expect(container.firstElementChild).toHaveAttribute('data-checked', 'true')
  })
})
