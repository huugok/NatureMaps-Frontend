import { groupNearbyPlants } from '../../services/plantGroups';
import type { GroupArea, GroupedPlants } from '../../services/plantGroups';
import type { PlantPin } from '../../types/plant';

// El worker es una optimización, no una dependencia: si no está disponible o
// falla, se agrupa directamente como se hacía antes y la carga sigue adelante.
const TIMEOUT_MS = 5000;

type Pending = {
  resolve: (value: GroupedPlants) => void;
  reject: (error: Error) => void;
};

let worker: Worker | null = null;
let broken = false;
let nextId = 0;
const pending = new Map<number, Pending>();

function breakWorker(): void {
  broken = true;
  worker?.terminate();
  worker = null;
  for (const job of pending.values()) job.reject(new Error('worker no disponible'));
  pending.clear();
}

function getWorker(): Worker | null {
  if (broken || typeof Worker === 'undefined') return null;
  if (worker) return worker;
  try {
    worker = new Worker(new URL('./plantGroups.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (event: MessageEvent<{
      id: number;
      pins: PlantPin[];
      areasById: Array<[number, GroupArea]>;
      areaByMemberId: Array<[number, GroupArea]>;
    }>) => {
      const { id, pins, areasById, areaByMemberId } = event.data;
      const job = pending.get(id);
      if (!job) return;
      pending.delete(id);
      job.resolve({
        pins,
        areasById: new Map(areasById),
        areaByMemberId: new Map(areaByMemberId),
      });
    };
    worker.onerror = () => breakWorker();
    worker.onmessageerror = () => breakWorker();
    return worker;
  } catch {
    breakWorker();
    return null;
  }
}

export async function groupOffThread(pins: PlantPin[]): Promise<GroupedPlants> {
  const instance = getWorker();
  if (!instance) return groupNearbyPlants(pins);
  const id = ++nextId;
  return new Promise<GroupedPlants>((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      breakWorker();
      reject(new Error('timeout al agrupar'));
    }, TIMEOUT_MS);
    pending.set(id, {
      resolve: (value) => { clearTimeout(timer); resolve(value); },
      reject: (error) => { clearTimeout(timer); reject(error); },
    });
    instance.postMessage({ id, pins });
  });
}
