// Cliente HTTP mínimo para el backend de Nature MAPS (huugok/NatureMaps-Backend).
// La URL se configura en .env → VITE_API_URL (por defecto http://localhost:3000).

export const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000'

export async function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { signal })
  if (!res.ok) {
    // El estado HTTP viaja con el error para que cada pantalla decida qué
    // mostrar (p. ej. 404 → «no existe», otro → «reintenta»).
    const error = new Error(`GET ${path} → ${res.status}`) as Error & { status?: number }
    error.status = res.status
    throw error
  }
  return res.json() as Promise<T>
}

/** Escritura genérica (PUT/DELETE) con el mismo contrato de error que apiGet. */
export async function apiSend<T>(method: 'PUT' | 'DELETE', path: string, body?: unknown): Promise<T | null> {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!res.ok) {
    const error = new Error(`${method} ${path} → ${res.status}`) as Error & { status?: number }
    error.status = res.status
    throw error
  }
  if (res.status === 204) return null;
  return res.json() as Promise<T>
}

/** GET /health — único endpoint que usa hoy el frontend. */
export async function checkHealth(signal?: AbortSignal): Promise<boolean> {
  try {
    const data = await apiGet<{ status: string }>('/health', signal)
    return data.status === 'ok'
  } catch {
    return false
  }
}
