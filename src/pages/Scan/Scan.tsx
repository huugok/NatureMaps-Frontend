import { ImageIcon, RefreshCw } from 'lucide-react'
import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Page } from '../../components/Page'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { useApp } from '../../context/useApp'
import { hasSeenCameraPermission } from '../../utils/cameraPermission'

/**
 * Escanear: cámara trasera real (requiere HTTPS o localhost) o foto de la galería.
 * La foto queda en `photo` (Blob) lista para enviarla al backend → Pl@ntNet.
 * La primera vez se pasa antes por la pantalla "Permiso cámara" (/permiso-camara).
 */
export function Scan() {
  const { t } = useApp()
  const location = useLocation()
  const handled = (location.state as { permissionHandled?: boolean } | null)?.permissionHandled
  const needsPermission = !handled && !hasSeenCameraPermission() && Boolean(navigator.mediaDevices?.getUserMedia)
  const videoRef = useRef<HTMLVideoElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [cameraOk, setCameraOk] = useState(() => Boolean(navigator.mediaDevices?.getUserMedia))
  // Foto capturada + URL temporal para mostrarla
  const [shot, setShot] = useState<{ blob: Blob; url: string } | null>(null)
  const photo = shot?.blob ?? null
  const previewUrl = shot?.url ?? null

  const setPhoto = (blob: Blob | null) => setShot(blob ? { blob, url: URL.createObjectURL(blob) } : null)

  // Libera la URL temporal cuando cambia la foto o se sale de la pantalla
  useEffect(() => () => void (shot && URL.revokeObjectURL(shot.url)), [shot])

  // Enciende la cámara mientras no haya foto; la apaga al salir.
  useEffect(() => {
    if (needsPermission || photo || !navigator.mediaDevices?.getUserMedia) return
    let stream: MediaStream | undefined
    let cancelled = false
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then((s) => {
        if (cancelled) return s.getTracks().forEach((tr) => tr.stop())
        stream = s
        if (videoRef.current) videoRef.current.srcObject = s
        setCameraOk(true)
      })
      .catch(() => setCameraOk(false))
    return () => {
      cancelled = true
      stream?.getTracks().forEach((tr) => tr.stop())
    }
  }, [photo, needsPermission])

  const capture = () => {
    const video = videoRef.current
    if (!video || !video.videoWidth) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')?.drawImage(video, 0, 0)
    canvas.toBlob((b) => b && setPhoto(b), 'image/jpeg', 0.9)
  }

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) setPhoto(file)
    e.target.value = ''
  }

  if (needsPermission) return <Navigate to="/permiso-camara" replace />

  return (
    <Page title={t('scan.title')} subtitle={t('scan.hint')}>
      <div className="relative grid aspect-[3/4] max-h-[55vh] place-items-center overflow-hidden rounded-panel bg-[#14251a]">
        {previewUrl ? (
          <img src={previewUrl} alt={t('scan.photoAlt')} className="size-full object-cover" />
        ) : cameraOk ? (
          <video ref={videoRef} className="size-full object-cover" autoPlay playsInline muted />
        ) : (
          <p className="p-6 text-center text-small text-white/80">{t('scan.noCamera')}</p>
        )}
      </div>

      {photo ? (
        <>
          <Card>{t('scan.pending')}</Card>
          <Button variant="secondary" icon={RefreshCw} block onClick={() => setPhoto(null)}>
            {t('scan.retake')}
          </Button>
        </>
      ) : (
        <div className="flex items-center justify-between gap-4">
          <Button variant="secondary" icon={ImageIcon} onClick={() => fileRef.current?.click()}>
            {t('scan.gallery')}
          </Button>
          {cameraOk && (
            <button type="button" className="size-[68px] rounded-full border-4 border-accent bg-white shadow-float" onClick={capture} aria-label={t('scan.shutter')} />
          )}
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
    </Page>
  )
}
