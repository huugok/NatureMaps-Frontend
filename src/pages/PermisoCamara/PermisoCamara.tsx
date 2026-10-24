import { useState } from 'react'
import { ScanLine } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Page } from '../../components/Page'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { useApp } from '../../context/useApp'
import { markCameraPermissionSeen } from '../../utils/cameraPermission'

/**
 * Permiso cámara: se muestra la primera vez que se accede a la cámara para
 * fotografiar una planta o un monumento. "Permitir" lanza el aviso real del navegador.
 */
export function PermisoCamara() {
  const { t } = useApp()
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
    <Page title={t('camera.title')} back>
      <EmptyState
        icon={ScanLine}
        title={t('camera.heading')}
        description={denied ? t('camera.denied') : t('camera.desc')}
      />
      {denied ? (
        <Button block onClick={goScan}>
          {t('camera.continue')}
        </Button>
      ) : (
        <>
          <Button block icon={ScanLine} onClick={allow}>
            {t('camera.allow')}
          </Button>
          <Button block variant="ghost" onClick={() => navigate('/inicio', { replace: true })}>
            {t('camera.later')}
          </Button>
        </>
      )}
    </Page>
  )
}
