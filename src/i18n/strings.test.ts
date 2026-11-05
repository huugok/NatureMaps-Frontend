import { describe, expect, it } from 'vitest'
import { LANGUAGES } from '../types/language'
import { dictionaries, translate } from './strings'

const variables = (text: string) => [...new Set(text.match(/\{\w+\}/g) ?? [])].sort()

describe('diccionarios JSON por idioma', () => {
  it.each(LANGUAGES)('%s contiene las mismas claves y variables que el español', (language) => {
    expect(Object.keys(dictionaries[language]).sort()).toEqual(Object.keys(dictionaries.es).sort())
    for (const [key, text] of Object.entries(dictionaries[language])) {
      expect(text.trim(), `${language}: ${key}`).not.toBe('')
      expect(variables(text), `${language}: ${key}`).toEqual(
        variables(dictionaries.es[key as keyof typeof dictionaries.es]),
      )
    }
  })

  it('sustituye nombres y números con el idioma pedido', () => {
    expect(translate('en', 'ficha.loadingDetail', { name: 'Jacaranda' })).toBe('Loading the Jacaranda card…')
    expect(translate('va', 'ficha.specimens', { count: 3 })).toBe('3 exemplars')
  })

  it('trata los caracteres especiales del nombre como texto literal', () => {
    expect(translate('es', 'ficha.photoAlt', { name: '$&' })).toBe('Fotografía de $&')
  })

  it('usa el español si falta una traducción en tiempo de ejecución', () => {
    const original = dictionaries.en['home.title']
    try {
      Reflect.deleteProperty(dictionaries.en, 'home.title')
      expect(translate('en', 'home.title')).toBe('Hola, explorador')
    } finally {
      dictionaries.en['home.title'] = original
    }
  })
})
