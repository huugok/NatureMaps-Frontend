import React, { useRef, useState } from 'react';
import { ResultadoEscaneo } from '../../components/ResultadoEscaneo';
import { identifyPlant } from '../../services/identify';
import type { PlantIdentification, PlantMatch } from '../../types/identify';

type Estado = 'sin-foto' | 'preparado' | 'identificando' | 'completado' | 'error';

export interface ScanPageProps {
  /**
   * Abre la ficha de la especie pulsada con la foto enviada. Si no se pasa, el
   * resultado no muestra el botón «Ver ficha».
   */
  onOpenSpecies?: (match: PlantMatch, photo: string | null) => void;
}

/**
 * UT F04 (RF2): envío de la foto de una planta a Pl@ntNet a través del backend.
 * Flujo de las PA 658-660: seleccionar foto → identificar (la app continúa el
 * proceso), nueva foto sustituye a la anterior y error de envío se comunica.
 *
 * UT F05 (RF18 · PA 689): el resultado muestra la especie más probable (con
 * acceso a su ficha) y las alternativas ordenadas por confianza para elegir.
 */
export const ScanPage: React.FC<ScanPageProps> = ({ onOpenSpecies }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [estado, setEstado] = useState<Estado>('sin-foto');
  const [resultado, setResultado] = useState<PlantIdentification | null>(null);
  const [elegida, setElegida] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const leerFoto = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result;
      setFotoUrl(typeof dataUrl === 'string' ? dataUrl : null);
    };
    reader.readAsDataURL(file);
  };

  const seleccionarFichero = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setFileName(file !== null ? file.name : null);
    if (file !== null) leerFoto(file);
    else setFotoUrl(null);
    // Al seleccionar otra foto se reinicia el estado: la nueva sustituye a la anterior (PA 659).
    setResultado(null);
    setElegida(null);
    setError(null);
    setEstado(file !== null ? 'preparado' : 'sin-foto');
  };

  const identificar = async () => {
    const file = inputRef.current?.files?.[0];
    if (!file || estado === 'identificando') {
      return;
    }
    setEstado('identificando');
    setError(null);
    setResultado(null);
    setElegida(null);
    try {
      const identification = await identifyPlant(file, file.name || 'planta.jpg');
      setResultado(identification);
      setEstado('completado');
    } catch (err) {
      setError(err instanceof Error ? err.message : null);
      setEstado('error');
    }
  };

  /** Vuelve al formulario manteniendo la foto ya elegida. */
  const cerrarResultado = () => {
    setEstado(fileName !== null ? 'preparado' : 'sin-foto');
  };

  /** Descarta la foto y la identificación para hacer otra. */
  const repetirFoto = () => {
    if (inputRef.current !== null) inputRef.current.value = '';
    setFileName(null);
    setFotoUrl(null);
    setResultado(null);
    setElegida(null);
    setError(null);
    setEstado('sin-foto');
  };

  return (
    <>
      <section aria-labelledby="escanear-titulo" className="mx-auto w-full max-w-md p-4 pb-24">
        <h1 id="escanear-titulo" className="text-lg font-semibold text-neutral-900">
          Escanear
        </h1>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png"
          aria-label="Foto de la planta"
          onChange={seleccionarFichero}
          className="mt-3 block text-sm text-neutral-700 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-emerald-700 file:px-3 file:py-2 file:font-medium file:text-white"
        />
        {fileName !== null && (
          <p className="mt-1 text-sm text-neutral-500">Foto seleccionada: {fileName}</p>
        )}

        <button
          type="button"
          onClick={identificar}
          disabled={fileName === null || estado === 'identificando'}
          className="mt-3 rounded-lg bg-emerald-700 px-4 py-2 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Identificar
        </button>

        {/* Aviso del proceso de envío: continuar, nueva foto o error (PAs 658-660). */}
        <div aria-live="polite" className="mt-4 text-sm">
          {estado === 'identificando' && <p role="status">Enviando la foto a Pl@ntNet…</p>}
          {estado === 'error' && (
            <>
              <p role="alert" className="font-medium text-red-700">
                No ha sido posible completar el envío de la foto.
              </p>
              {error !== null && <p className="mt-1 text-neutral-600">{error}</p>}
            </>
          )}
        </div>
      </section>

      {estado === 'completado' && resultado !== null && (
        <ResultadoEscaneo
          photoUrl={fotoUrl}
          matches={resultado.results}
          selectedName={elegida}
          onSelectAlternative={setElegida}
          onOpenPrimary={
            onOpenSpecies !== undefined
              ? (match) => onOpenSpecies(match, fotoUrl)
              : undefined
          }
          onBack={cerrarResultado}
          onRepeatPhoto={repetirFoto}
        />
      )}
    </>
  );
};

export default ScanPage;
