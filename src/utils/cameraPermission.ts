// La pantalla "Permiso cámara" se enseña la primera vez que se entra a la cámara
// (foto de planta o de monumento). Aquí se recuerda que el usuario ya decidió.
const KEY = 'naturemaps:camera-permission-seen'

export function hasSeenCameraPermission(): boolean {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export function markCameraPermissionSeen() {
  try {
    localStorage.setItem(KEY, '1')
  } catch {
    /* almacenamiento no disponible: se volverá a preguntar */
  }
}
