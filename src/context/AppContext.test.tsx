import { act, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { AppProvider, LANG_KEY } from './AppContext'
import { useApp } from './useApp'

function Probe() {
  const { lang, t, setLang } = useApp()
  return (
    <>
      <p data-testid="lang">{lang}</p>
      <p>{t('settings.title')}</p>
      <button onClick={() => setLang('va')}>va</button>
    </>
  )
}

describe('AppProvider (idioma)', () => {
  beforeEach(() => localStorage.clear())

  it('por defecto usa español', () => {
    render(<AppProvider><Probe /></AppProvider>)
    expect(screen.getByTestId('lang')).toHaveTextContent('es')
    expect(screen.getByText('Ajustes')).toBeInTheDocument()
    expect(document.documentElement.lang).toBe('es')
  })

  it('recupera el idioma guardado y descarta valores no válidos', () => {
    localStorage.setItem(LANG_KEY, 'en')
    const { unmount } = render(<AppProvider><Probe /></AppProvider>)
    expect(screen.getByText('Settings')).toBeInTheDocument()
    unmount()
    localStorage.setItem(LANG_KEY, 'fr')
    render(<AppProvider><Probe /></AppProvider>)
    expect(screen.getByTestId('lang')).toHaveTextContent('es')
  })

  it('al cambiar a valenciano traduce, lo guarda y marca <html lang="ca">', () => {
    render(<AppProvider><Probe /></AppProvider>)
    act(() => screen.getByRole('button', { name: 'va' }).click())
    expect(screen.getByText('Ajustos')).toBeInTheDocument()
    expect(localStorage.getItem(LANG_KEY)).toBe('va')
    expect(document.documentElement.lang).toBe('ca')
  })
})
