import React, { useRef, useState } from 'react';
import {
  AVISO_CONFIANZA_BAJA,
  CONFIANZA_MINIMA,
  CONFIRMACION_ELECCION,
  EspeciesAlternativas,
} from '../../components/EspeciesAlternativas';
import { identifyPlant } from '../../services/identify';
import type { PlantIdentification, PlantMatch } from '../../types/identify';

type Estado = 'sin-foto' | 'preparado' | 'identificando' | 'completado' | 'error';

/**
 * UT F04 (RF2): envío de la foto de una planta a Pl@ntNet a través del backend.
 * Flujo de las PA 658-660: seleccionar foto → identificar (la app continúa el
 * proceso), nueva foto sustituye a la anterior y error de envío se comunica.
 *
 * UT F05 (RF18 · PA 689): cuando la mejor coincidencia no llega a
 * `CONFIANZA_MINIMA`, en lugar del listado se ofrecen las especies
 * alternativas ordenadas por confianza y el usuario elige una.
 *
 * UT F05 (PA 1250 · PA 692): el botón «Ver ficha» abre la especie principal y
 * tocar una alternativa abre la suya.
 */
export interface ScanPageProps {
  /** Abre la ficha de la especie indicada. */
  onOpenSpecies?: (match: PlantMatch, photo: string | null) => void;
}

export const ScanPage: React.FC<ScanPageProps> = ({ onOpenSpecies }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [estado, setEstado] = useState<Estado>('sin-foto');
  const [resultado, setResultado] = useState<PlantIdentification | null>(null);
  const [elegida, setElegida] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const seleccionarFichero = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setFileName(file !== null ? file.name : null);
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

  const abrirFicha = (match: PlantMatch) => {
    setElegida(match.scientificName);
    onOpenSpecies?.(match, null);
  };

  const mejorCoincidencia = resultado?.results[0] ?? null;
  const confianzaBaja =
    mejorCoincidencia !== null && mejorCoincidencia.score < CONFIANZA_MINIMA;

  return (
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
        {estado === 'completado' && resultado !== null && (
          <>
            <p role="status">
              Identificación completada ({resultado.results.length}{' '}
              {resultado.results.length === 1 ? 'especie candidata' : 'especies candidatas'}). El
              proceso de identificación continúa con la foto enviada.
            </p>
            {resultado.results.length === 0 && (
              <p className="mt-2 text-neutral-600">Pl@ntNet no ha devuelto candidatas para esta foto.</p>
            )}
            {confianzaBaja ? (
              <>
                {/* PA 689: la mejor coincidencia no es concluyente → varias especies para elegir. */}
                <p className="mt-3 text-sm text-amber-800">{AVISO_CONFIANZA_BAJA}</p>
                <EspeciesAlternativas
                  matches={resultado.results}
                  selectedName={elegida}
                  onSelect={(nombre) => {
                    const candidata = resultado.results.find(
                      (match) => match.scientificName === nombre,
                    );
                    if (candidata) abrirFicha(candidata);
                    else setElegida(nombre);
                  }}
                />
                {elegida !== null && (
                  <p role="status" className="mt-3 text-sm font-medium text-emerald-800">
                    {CONFIRMACION_ELECCION}: {elegida}
                  </p>
                )}
              </>
            ) : (
              resultado.results.length > 0 && (
                // Identificación clara: candidatas en texto, para comprobar la respuesta de Pl@ntNet.
                <ol className="mt-2 list-decimal pl-5 text-neutral-800">
                  {resultado.results.map((candidata, index) => (
                    <li key={index} className="leading-relaxed">
                      {candidata.scientificName}
                      {candidata.author !== null && ` ${candidata.author}`}
                      {' — '}
                      {(candidata.score * 100).toFixed(1).replace('.', ',')}%
                      {candidata.commonNames.length > 0 && ` — ${candidata.commonNames.join(', ')}`}
                    </li>
                  ))}
                </ol>
              )
            )}
            {mejorCoincidencia !== null && (
              // PA 1250: la ficha del resultado principal.
              <button
                type="button"
                onClick={() => abrirFicha(mejorCoincidencia)}
                className="mt-3 rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white"
              >
                Ver ficha
              </button>
            )}
          </>
        )}
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
  );
};

export default ScanPage;
