import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { ReactNode } from 'react'
import { AppProvider } from './AppContext'
import { useApp } from './useApp'
import { LANGUAGE_STORAGE_KEY } from '../services/languagePreference'

const wrapper = ({ children }: { children: ReactNode }) => <AppProvider>{children}</AppProvider>

describe('AppContext · idioma', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.lang = 'es'
  })

  afterEach(() => localStorage.clear())

  it('arranca en español y traduce con el diccionario', () => {
    const { result } = renderHook(() => useApp(), { wrapper })
    expect(result.current.lang).toBe('es')
    expect(result.current.t('home.title')).toBe('Hola, explorador')
  })

  it('setLang persiste en languagePreference y actualiza t()', () => {
    const { result } = renderHook(() => useApp(), { wrapper })

    act(() => result.current.setLang('en'))

    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('en')
    expect(result.current.lang).toBe('en')
    expect(result.current.t('home.title')).toBe('Hi, explorer')
    expect(document.documentElement.lang).toBe('en')
  })

  it('el valenciano se guarda como "va" y se anuncia como "ca"', () => {
    const { result } = renderHook(() => useApp(), { wrapper })

    act(() => result.current.setLang('va'))

    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('va')
    expect(result.current.t('home.title')).toBe('Hola, explorador')
    expect(document.documentElement.lang).toBe('ca')
  })

  it('restaura la preferencia guardada al montar', () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'en')
    const { result } = renderHook(() => useApp(), { wrapper })
    expect(result.current.lang).toBe('en')
    expect(document.documentElement.lang).toBe('en')
  })
})
