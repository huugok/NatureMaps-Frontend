import React, { useState, useRef, useEffect } from 'react';
import type { CameraMode, PermissionStatus, CameraScreenProps, SavedPhoto } from './types';
import { CameraPermissionPrompt } from './CameraPermissionPrompt';
import { CameraPermissionDenied } from './CameraPermissionDenied';
import { CameraActive } from './CameraActive';

export const CameraScreen: React.FC<CameraScreenProps> = ({
  onClose,
  initialMode = 'planta',
  onPhotoCaptured,
  onIdentifyPhoto,
  identificationStatus = 'idle',
  identificationResults = null,
  identificationError = null,
}) => {
  const [permission, setPermission] = useState<PermissionStatus>('checking');
  const [mode, setMode] = useState<CameraMode>(initialMode);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Comprobar si el navegador ya concedió permisos previamente
  useEffect(() => {
    let isMounted = true;

    async function checkExistingPermission() {
      if (navigator.permissions && navigator.permissions.query) {
        try {
          // Consultar el estado de permisos de la cámara si la API está disponible
          const status = await navigator.permissions.query({ name: 'camera' as PermissionName });
          if (!isMounted) return;

          if (status.state === 'granted') {
            setPermission('granted');
          } else if (status.state === 'denied') {
            setPermission('denied');
          } else {
            setPermission('prompt');
          }

          status.onchange = () => {
            if (!isMounted) return;
            if (status.state === 'granted') setPermission('granted');
            else if (status.state === 'denied') setPermission('denied');
            else setPermission('prompt');
          };
        } catch {
          // Si permissions.query no soporta 'camera', mostramos el paso de permiso.
          if (isMounted) setPermission('prompt');
        }
      } else {
        setPermission('prompt');
      }
    }

    void checkExistingPermission();

    return () => {
      isMounted = false;
    };
  }, []);

  // Solicitar permiso de cámara
  const handleRequestPermission = async () => {
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        // Detener el stream temporal; CameraActive lo inicializará
        stream.getTracks().forEach((track) => track.stop());
        setPermission('granted');
      } else {
        // En entornos sin mediaDevices, concedemos para mostrar el visor con simulación
        setPermission('granted');
      }
    } catch {
      // Usuario rechazó el permiso en el navegador o no hay cámara
      setPermission('denied');
    }
  };

  // El usuario pulsa "No permitir cámara"
  const handleDenyPermission = () => {
    setPermission('denied');
  };

  const handleSavePhoto = (photo: SavedPhoto): boolean => {
    try {
      if (typeof localStorage === 'undefined') return false;
      const stored = localStorage.getItem('naturemaps.savedPhotos');
      const current = stored ? JSON.parse(stored) as SavedPhoto[] : [];
      localStorage.setItem('naturemaps.savedPhotos', JSON.stringify([photo, ...current]));
      return true;
    } catch {
      return false;
    }
  };

  // Abrir selector de galería
  const handleOpenGallery = () => {
    fileInputRef.current?.click();
  };

  // Manejar imagen elegida de la galería
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        onPhotoCaptured?.(dataUrl, mode);
      };
      reader.readAsDataURL(file);
    }
    // Reset para permitir seleccionar el mismo archivo
    e.target.value = '';
  };

  return (
    <div className="relative w-full h-full min-h-0 bg-black">
      {/* Input oculto para elegir foto de la galería */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png"
        aria-hidden="true"
        className="hidden"
        onChange={handleFileChange}
      />

      {permission === 'checking' && (
        <div className="flex h-full w-full items-center justify-center bg-[#102416]" role="status" aria-label="Comprobando permiso de cámara">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        </div>
      )}

      {/* Estado 1: Solicitud inicial de permiso de cámara */}
      {permission === 'prompt' && (
        <CameraPermissionPrompt
          onAllow={() => void handleRequestPermission()}
          onDeny={handleDenyPermission}
          onSelectFromGallery={handleOpenGallery}
          onBack={onClose}
        />
      )}

      {/* Estado 2: Permiso denegado / Cámara desactivada */}
      {permission === 'denied' && (
        <CameraPermissionDenied
          mode={mode}
          onModeChange={setMode}
          onOpenSettings={() => void handleRequestPermission()}
          onSelectFromGallery={handleOpenGallery}
          onBack={onClose}
        />
      )}

      {/* Estado 3: Cámara activa con selector Planta / Monumento */}
      {permission === 'granted' && (
        <CameraActive
          mode={mode}
          onModeChange={setMode}
          onClose={onClose}
          onSelectFromGallery={handleOpenGallery}
          onPhotoCaptured={onPhotoCaptured}
          onIdentifyPhoto={onIdentifyPhoto}
          onSavePhoto={handleSavePhoto}
          identificationStatus={identificationStatus}
          identificationResults={identificationResults}
          identificationError={identificationError}
        />
      )}
    </div>
  );
};

