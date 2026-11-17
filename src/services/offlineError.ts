import type { OfflineErrorCode } from '../types/offline';

/** Fallo del modo sin conexión con un código que la interfaz traduce a un mensaje. */
export class OfflineError extends Error {
  readonly code: OfflineErrorCode;

  constructor(code: OfflineErrorCode, message: string) {
    super(message);
    this.name = 'OfflineError';
    this.code = code;
  }
}

export function isAbortError(error: unknown): boolean {
  // Por nombre y no con instanceof: la DOMException puede venir de otro contexto (jsdom, iframes).
  return typeof error === 'object' && error !== null && (error as { name?: unknown }).name === 'AbortError';
}

/**
 * ¿El fallo es de red (sin conexión, servidor caído) y no una respuesta del
 * backend como un 404? Solo en ese caso se sirve lo descargado.
 */
export function isUnreachable(error: unknown): boolean {
  if (isAbortError(error)) return false;
  if (error instanceof TypeError) return true;
  return error instanceof Error && /→ 5\d\d$/.test(error.message);
}
