import { useLayoutEffect, useState } from 'react'

/** Tamaño exterior del marco: 402×874 de contenido + 8 px de borde por lado. */
const FRAME_WIDTH = 418
const FRAME_HEIGHT = 890
const MARGIN = 16

const MOBILE_QUERY = '(max-width: 480px), (max-width: 900px) and (max-height: 500px)'

/**
 * Escala uniforme del marco para que el móvil completo quepa en la ventana.
 * No cambia el layout interno: solo reduce el marco entero, como un simulador
 * de dispositivo. En móvil real devuelve 1 (pantalla completa).
 */
export function useAppFrameScale(): number {
  const [scale, setScale] = useState(1)

  useLayoutEffect(() => {
    const update = () => {
      if (typeof window.matchMedia === 'function' && window.matchMedia(MOBILE_QUERY).matches) {
        setScale(1)
        return
      }
      const availableWidth = window.innerWidth - MARGIN * 2
      const availableHeight = window.innerHeight - MARGIN * 2
      setScale(Math.min(1, availableWidth / FRAME_WIDTH, availableHeight / FRAME_HEIGHT))
    }

    update()
    window.addEventListener('resize', update)
    window.visualViewport?.addEventListener('resize', update)
    return () => {
      window.removeEventListener('resize', update)
      window.visualViewport?.removeEventListener('resize', update)
    }
  }, [])

  return scale
}
