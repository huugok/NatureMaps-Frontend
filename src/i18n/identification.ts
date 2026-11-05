import type { IdentificationFailure } from '../types/identify'
import type { StringKey, Translator } from './strings'

const ERROR_KEYS: Partial<Record<number, StringKey>> = {
  400: 'identification.rejected',
  404: 'identification.noMatch',
  413: 'identification.rejected',
  429: 'identification.limit',
  502: 'identification.unavailable',
  504: 'identification.unavailable',
}

/** Se traduce en el render para que un cambio de idioma actualice también el aviso. */
export function identificationErrorText(error: IdentificationFailure, t: Translator): string {
  if (error.code === 'unreachable') return t('identification.unreachable')
  if (error.code === 'invalid-image') return t('identification.invalidImage')
  const key = error.status === undefined ? undefined : ERROR_KEYS[error.status]
  if (key) return t(key)
  return error.status === undefined
    ? t('camera.error')
    : t('identification.httpError', { status: error.status })
}
