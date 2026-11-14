export type AppPermission = 'geolocation' | 'camera' | 'notifications'

const STORAGE_PREFIX = 'naturemaps:permission-enabled:'

export function isPermissionEnabled(permission: AppPermission): boolean {
  return localStorage.getItem(`${STORAGE_PREFIX}${permission}`) !== 'false'
}

export function savePermissionEnabled(permission: AppPermission, enabled: boolean): void {
  localStorage.setItem(`${STORAGE_PREFIX}${permission}`, String(enabled))
}
