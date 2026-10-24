/** Une clases de Tailwind ignorando los valores vacíos: cn('a', cond && 'b'). */
export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ')
}
