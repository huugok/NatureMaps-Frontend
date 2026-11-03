import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SectionLabel } from './SectionLabel'

describe('SectionLabel', () => {
  it('muestra el texto', () => {
    render(<SectionLabel>Servidor</SectionLabel>)
    expect(screen.getByText('Servidor')).toBeInTheDocument()
  })
})
