import React, { useRef, useState } from 'react';
import { identifyPlant } from '../../services/identify';
import type { PlantIdentification } from '../../types/identify';

type Estado = 'sin-foto' | 'preparado' | 'identificando' | 'completado' | 'error';

/**
 * UT F04 (RF2): envío de la foto de una planta a Pl@ntNet a través del backend.
 * Flujo de las PA 658-660: seleccionar foto → identificar (la app continúa el
 * proceso), nueva foto sustituye a la anterior y error de envío se comunica.
 * La pantalla de resultados es otra UT: aquí solo se confirma que el envío se completó.
 */
export const ScanPage: React.FC = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [estado, setEstado] = useState<Estado>('sin-foto');
  const [resultado, setResultado] = useState<PlantIdentification | null>(null);
  const [error, setError] = useState<string | null>(null);

  const seleccionarFichero = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setFileName(file !== null ? file.name : null);
    // Al seleccionar otra foto se reinicia el estado: la nueva sustituye a la anterior (PA 659).
    setResultado(null);
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
    try {
      const identification = await identifyPlant(file, file.name || 'planta.jpg');
      setResultado(identification);
      setEstado('completado');
    } catch (err) {
      setError(err instanceof Error ? err.message : null);
      setEstado('error');
    }
  };

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
            {/* Candidatas en texto, para poder comprobar la respuesta de Pl@ntNet. */}
            {resultado.results.length > 0 ? (
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
            ) : (
              <p className="mt-2 text-neutral-600">Pl@ntNet no ha devuelto candidatas para esta foto.</p>
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
