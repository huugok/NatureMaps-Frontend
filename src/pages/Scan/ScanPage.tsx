import React, { useRef, useState } from 'react';
import { identifyPlant } from '../../services/identify';
import type { PlantIdentification } from '../../types/identify';

type Estado = 'sin-foto' | 'preparado' | 'identificando' | 'completado' | 'error';

/**
 * UT 931 (RF2): mostrar al usuario la especie más probable, con su nombre
 * común y científico (PA 661). Cuando la foto no identifica una única especie
 * con suficiente certeza, se muestran varias opciones para elegir (PA 662) y
 * cada identificación nueva sustituye al resultado anterior (PA 663).
 * La observación de la PA 662 no fija el nivel de certeza: se usa 0.5, por
 * encima del cual Pl@ntNet suele acertar la especie concreta.
 */
const CLARIDAD_MINIMA = 0.5;

/** Nombre para pintar la especie: común si hay, científico como respaldo. */
function nombreComun(cientifico: string, comunes: string[]): string {
  return comunes.length > 0 ? `${comunes[0]} (${cientifico})` : cientifico;
}

/**
 * UT F04 (RF2): envío de la foto de una planta a Pl@ntNet a través del backend.
 * Flujo de las PA 658-660: seleccionar foto → identificar (la app continúa el
 * proceso), nueva foto sustituye a la anterior y error de envío se comunica.
 */
export const ScanPage: React.FC = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [estado, setEstado] = useState<Estado>('sin-foto');
  const [resultado, setResultado] = useState<PlantIdentification | null>(null);
  const [elegida, setElegida] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const seleccionarFichero = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setFileName(file !== null ? file.name : null);
    // Al seleccionar otra foto se reinicia el estado: la nueva sustituye a la anterior (PA 659, PA 663).
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

  const masProbable = resultado?.results[0] ?? null;
  const identificacionClara = masProbable !== null && masProbable.score >= CLARIDAD_MINIMA;

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

        {estado === 'error' && (
          <>
            <p role="alert" className="font-medium text-red-700">
              No ha sido posible completar el envío de la foto.
            </p>
            {error !== null && <p className="mt-1 text-neutral-600">{error}</p>}
          </>
        )}

        {estado === 'completado' && resultado !== null && masProbable === null && (
          <p role="status" className="text-neutral-600">
            Pl@ntNet no ha devuelto candidatas para esta foto.
          </p>
        )}

        {estado === 'completado' && resultado !== null && masProbable !== null && (
          <>
            {/* UT 931 / PA 661: la especie más probable, siempre visible. */}
            <p role="status" className="mt-1 text-neutral-600">
              Especie más probable:
            </p>
            <p className="text-lg font-semibold text-neutral-900">
              {masProbable.commonNames.length > 0
                ? nombreComun(masProbable.scientificName, masProbable.commonNames)
                : masProbable.scientificName}
              {masProbable.author !== null && ` ${masProbable.author}`}
            </p>
            <p className="text-sm text-neutral-500">
              {(masProbable.score * 100).toFixed(1).replace('.', ',')}% de puntuación
            </p>

            {identificacionClara ? (
              // PA 661: certeza suficiente → se muestra una única especie.
              <p role="status" className="mt-2 text-sm text-emerald-800">
                Identificación clara: esta es la especie identificada.
              </p>
            ) : (
              // PA 662: sin certeza suficiente → varias opciones para elegir.
              <fieldset className="mt-3 text-sm">
                <legend className="text-neutral-600">
                  Sin certeza suficiente: elige la especie que consideres correcta (PA 662)
                </legend>
                <div className="mt-1 space-y-1 text-neutral-800">
                  {resultado.results.map((candidata, index) => (
                    <label
                      key={index}
                      className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1 leading-relaxed hover:bg-neutral-200"
                    >
                      <input
                        type="radio"
                        name="especie-candidata"
                        checked={elegida === candidata.scientificName}
                        onChange={() => setElegida(candidata.scientificName)}
                        className="mt-1 accent-emerald-700"
                      />
                      <span>
                        {candidata.scientificName}
                        {candidata.author !== null && ` ${candidata.author}`}

                        {' — '}
                        {(candidata.score * 100).toFixed(1).replace('.', ',')}%
                        {candidata.commonNames.length > 0 &&
                          ` — ${candidata.commonNames.join(', ')}`}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}

            {/* Confirmación de la elección de la PA 662. */}
            {elegida !== null && (
              <p role="status" className="mt-2 text-sm font-medium text-emerald-800">
                Especie elegida: {elegida}
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
};

export default ScanPage;
