import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchNearbyTrees, saveNearbyTreesCache } from './nearby'
import { createMemoryPlantCache, createMemoryStore, offlineStorage, setOfflineStorage, setPlantCache } from './offlineStorage'

const api = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock('./api', () => ({ apiGet: api.get }))

const response = {
  center: { latitude: 39.47, longitude: -0.37 }, radius: 1000, returned: 2,
  total: 2, limit: 2, language: 'es',
  trees: [
    { id: 1, speciesId: 3, scientificName: null, commonName: 'Almez', displayName: 'Almez', latitude: 39.47, longitude: -0.37, distance: 50 },
    { id: 2, speciesId: 4, scientificName: null, commonName: 'Olivo', displayName: 'Olivo', latitude: 39.4701, longitude: -0.37, distance: 60 },
  ],
}

describe('caché de plantas en IndexedDB', () => {
  afterEach(() => {
    setPlantCache(undefined)
    setOfflineStorage(undefined)
    api.get.mockReset()
  })

  it('guarda la carga completa y la reutiliza sin volver a la API', async () => {
    setPlantCache(createMemoryPlantCache())
    api.get.mockResolvedValue(structuredClone(response))
    const params = { latitude: 39.47, longitude: -0.37, radius: 1000, lang: 'es', limit: 2, offset: 0 }

    const first = await fetchNearbyTrees(params)
    expect(api.get).toHaveBeenCalledTimes(1)
    expect(first.trees).toHaveLength(2)
    await saveNearbyTreesCache(params, first.trees)

    const second = await fetchNearbyTrees(params)
    expect(api.get).toHaveBeenCalledTimes(1)
    expect(second.trees.map((tree) => tree.displayName)).toEqual(['Almez', 'Olivo'])
    expect(second.total).toBe(2)
  })

  it('limpiar la caché de plantas no toca las zonas guardadas por el usuario', async () => {
    const plants = createMemoryPlantCache()
    setPlantCache(plants)
    setOfflineStorage({ store: createMemoryStore(), tiles: {
      get: async () => undefined, put: async () => undefined, delete: async () => undefined,
    } })
    await plants.put('clave', { savedAt: Date.now(), trees: response.trees })
    await offlineStorage().store.put({ groupSlug: 'jardin-del-turia' } as never)

    await plants.clear()

    expect(await plants.get('clave')).toBeUndefined()
    expect(await offlineStorage().store.get('jardin-del-turia')).toBeDefined()
  })

  it('una clave distinta (otro radio) no reutiliza la caché', async () => {
    setPlantCache(createMemoryPlantCache())
    api.get.mockResolvedValue(structuredClone(response))
    await fetchNearbyTrees({ latitude: 39.47, longitude: -0.37, radius: 1000, lang: 'es', limit: 2, offset: 0 })
    await fetchNearbyTrees({ latitude: 39.47, longitude: -0.37, radius: 2500, lang: 'es', limit: 2, offset: 0 })
    expect(api.get).toHaveBeenCalledTimes(2)
  })
})
