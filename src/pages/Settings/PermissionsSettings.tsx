import { Bell, Camera, Info, MapPin } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Page } from '../../components/Page'
import { SectionLabel } from '../../components/ui/SectionLabel'
import { Switch } from '../../components/ui/Switch'
import { useApp } from '../../context/useApp'
import { isPermissionEnabled, savePermissionEnabled } from '../../services/permissionPreferences'

type PermissionKind = 'geolocation' | 'camera' | 'notifications'
type PermissionState = 'granted' | 'denied' | 'prompt' | 'unsupported' | 'checking'

interface PermissionDefinition {
  kind: PermissionKind
  icon: typeof MapPin
  titleKey: 'settings.permissionLocation' | 'settings.permissionCamera' | 'settings.permissionNotifications'
  descriptionKey:
    | 'settings.permissionLocationDesc'
    | 'settings.permissionCameraDesc'
    | 'settings.permissionNotificationsDesc'
}

const permissions: PermissionDefinition[] = [
  {
    kind: 'geolocation',
    icon: MapPin,
    titleKey: 'settings.permissionLocation',
    descriptionKey: 'settings.permissionLocationDesc',
  },
  {
    kind: 'camera',
    icon: Camera,
    titleKey: 'settings.permissionCamera',
    descriptionKey: 'settings.permissionCameraDesc',
  },
  {
    kind: 'notifications',
    icon: Bell,
    titleKey: 'settings.permissionNotifications',
    descriptionKey: 'settings.permissionNotificationsDesc',
  },
]

async function readPermission(kind: PermissionKind): Promise<PermissionState> {
  if (kind === 'notifications' && typeof Notification !== 'undefined') {
    if (Notification.permission === 'granted') return 'granted'
    if (Notification.permission === 'denied') return 'denied'
  }
  if (kind === 'geolocation' && !navigator.geolocation) return 'unsupported'
  if (kind === 'camera' && !navigator.mediaDevices?.getUserMedia) return 'unsupported'
  if (kind === 'notifications' && typeof Notification === 'undefined') return 'unsupported'
  if (!navigator.permissions?.query) return 'prompt'
  try {
    const result = await navigator.permissions.query({ name: kind as PermissionName })
    return result.state
  } catch {
    return 'prompt'
  }
}

async function requestPermission(kind: PermissionKind): Promise<void> {
  if (kind === 'geolocation') {
    if (!navigator.geolocation) return
    await new Promise<void>((resolve) => {
      navigator.geolocation.getCurrentPosition(() => resolve(), () => resolve())
    })
    return
  }
  if (kind === 'camera') {
    if (!navigator.mediaDevices?.getUserMedia) return
    const stream = await navigator.mediaDevices.getUserMedia({ video: true })
    stream?.getTracks().forEach((track) => track.stop())
    return
  }
  if (typeof Notification !== 'undefined') await Notification.requestPermission()
}

export function PermissionsSettings({ onBack }: { onBack: () => void }) {
  const { t } = useApp()
  const [states, setStates] = useState<Record<PermissionKind, PermissionState>>({
    geolocation: 'checking',
    camera: 'checking',
    notifications: 'checking',
  })
  const [enabled, setEnabled] = useState<Record<PermissionKind, boolean>>({
    geolocation: isPermissionEnabled('geolocation'),
    camera: isPermissionEnabled('camera'),
    notifications: isPermissionEnabled('notifications'),
  })

  const refresh = useCallback(async () => {
    const next = await Promise.all(
      permissions.map(async ({ kind }) => [kind, await readPermission(kind)] as const),
    )
    setStates(Object.fromEntries(next) as Record<PermissionKind, PermissionState>)
  }, [])

  useEffect(() => {
    void refresh()
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void refresh()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [refresh])

  const handleRequest = async (kind: PermissionKind) => {
    try {
      await requestPermission(kind)
    } finally {
      await refresh()
    }
  }

  return (
    <Page title={t('settings.permissions')} back onBack={onBack} settings={false}>
      <p className="text-small text-muted text-pretty">{t('settings.permissionsDescription')}</p>
      <SectionLabel>{t('settings.permissionsSection')}</SectionLabel>
      <div className="flex flex-col gap-3">
        {permissions.map(({ kind, icon: Icon, titleKey, descriptionKey }) => {
          const state = states[kind]
          const stateLabel = state === 'granted'
            ? t('settings.permissionGranted')
            : state === 'denied'
              ? t('settings.permissionDenied')
              : state === 'checking'
                ? t('settings.permissionChecking')
                : t('settings.permissionPending')
          return (
            <article key={kind} className="rounded-card bg-surface p-4 shadow-raised">
              <div className="flex items-start gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
                  <Icon size={20} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-body font-semibold text-ink">{t(titleKey)}</h2>
                    <button
                      type="button"
                      aria-label={t('settings.permissionInfo', { name: t(titleKey) })}
                      title={t(descriptionKey)}
                      className="grid size-8 shrink-0 place-items-center rounded-full text-muted hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      <Info size={16} aria-hidden="true" />
                    </button>
                  </div>
                  <p className="mt-1 text-small text-muted text-pretty">{t(descriptionKey)}</p>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className={`text-small font-semibold ${state === 'granted' ? 'text-accent' : 'text-muted'}`}>
                        {enabled[kind] ? stateLabel : t('settings.permissionDisabled')}
                      </span>
                      <Switch
                        checked={enabled[kind]}
                        onChange={(next) => {
                          setEnabled((current) => ({ ...current, [kind]: next }))
                          savePermissionEnabled(kind, next)
                        }}
                        label={t('settings.permissionToggle', { name: t(titleKey) })}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleRequest(kind)}
                      disabled={!enabled[kind] || state === 'checking' || state === 'unsupported'}
                      className="min-h-11 rounded-control bg-accent px-3 text-small font-semibold text-on-accent disabled:opacity-50"
                    >
                      {t('settings.permissionButton')}
                    </button>
                  </div>
                </div>
              </div>
            </article>
          )
        })}
      </div>
      <p className="text-caption text-muted text-pretty">{t('settings.permissionsBrowserNote')}</p>
    </Page>
  )
}
