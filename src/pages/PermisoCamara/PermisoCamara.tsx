import { useState } from 'react'
import { ScanLine } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Page } from '../../components/Page'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { markCameraPermissionSeen } from '../../utils/cameraPermission'

/**
 * Permiso cámara: se muestra la primera vez que se accede a la cámara para
 * fotografiar una planta o un monumento. "Permitir" lanza el aviso real del navegador.
 */
export function PermisoCamara() {
  const navigate = useNavigate()
  const [denied, setDenied] = useState(false)

  const goScan = () => {
    markCameraPermissionSeen()
    navigate('/escanear', { replace: true, state: { permissionHandled: true } })
  }

  const allow = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      stream.getTracks().forEach((tr) => tr.stop())
      goScan()
    } catch {
      markCameraPermissionSeen()
      setDenied(true)
    }
  }

  return (
    <Page title="Escanear" back>
      <EmptyState
        icon={ScanLine}
        title="Permiso de cámara"
        description={
          denied
            ? 'No has dado permiso a la cámara. Puedes activarlo en los ajustes del navegador o elegir una foto de la galería.'
            : 'Nature MAPS necesita la cámara para que puedas fotografiar una planta o un monumento e identificarlo. Solo se usa cuando escaneas.'
        }
      />
      {denied ? (
        <Button block onClick={goScan}>
          Continuar
        </Button>
      ) : (
        <>
          <Button block icon={ScanLine} onClick={allow}>
            Permitir la cámara
          </Button>
          <Button block variant="ghost" onClick={() => navigate('/inicio', { replace: true })}>
            Ahora no
          </Button>
        </>
      )}
    </Page>
  )
}
