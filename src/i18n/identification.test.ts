import { describe, expect, it } from 'vitest'
import { identificationErrorText } from './identification'
import { translate, type Translator } from './strings'

const english: Translator = (key, vars) => translate('en', key, vars)

describe('errores de identificación traducidos', () => {
  it('distingue red y rechazo HTTP sin depender de una frase en español', () => {
    expect(identificationErrorText({ code: 'unreachable' }, english)).toBe('The identification server could not be reached')
    expect(identificationErrorText({ code: 'request', status: 429 }, english)).toContain('limit has been reached')
  })

  it('ofrece un mensaje traducido para una imagen inválida o un estado no conocido', () => {
    expect(identificationErrorText({ code: 'invalid-image' }, english)).toContain('invalid format')
    expect(identificationErrorText({ code: 'request', status: 503 }, english)).toBe('Identification could not be completed (HTTP 503)')
    expect(identificationErrorText({ code: 'request' }, english)).toBe(translate('en', 'camera.error'))
  })
})
