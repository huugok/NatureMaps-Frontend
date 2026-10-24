import { fireEvent, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { renderWithProviders } from '../../test/renderWithProviders'
import { Language } from './Language'

describe('Language', () => {
  beforeEach(() => localStorage.clear())

  it('ofrece los tres idiomas y marca el actual', () => {
    renderWithProviders(<Language />)
    expect(screen.getByRole('button', { name: 'Español' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Valencià' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'English' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('al elegir uno se aplica al instante y se guarda en naturemaps.language', () => {
    renderWithProviders(<Language />)
    fireEvent.click(screen.getByRole('button', { name: 'English' }))
    expect(screen.getByRole('heading', { name: 'Language' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'English' })).toHaveAttribute('aria-pressed', 'true')
    expect(localStorage.getItem('naturemaps.language')).toBe('en')
    expect(document.documentElement.lang).toBe('en')
  })
})
