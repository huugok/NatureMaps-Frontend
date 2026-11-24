import { screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { createMemoryRouteStore, setOfflineRouteStore } from '../../services/offlineRouteStorage'
import { savedRoute } from '../../test/routeOfflineFixtures'
import { renderWithProviders } from '../../test/renderWithProviders'
import { DownloadsSettings } from './DownloadsSettings'

const onBack = () => undefined

afterEach(() => setOfflineRouteStore())

describe('DownloadsSettings', () => {
  it('explica el estado vacío cuando no hay rutas descargadas', async () => {
    setOfflineRouteStore(createMemoryRouteStore())
    renderWithProviders(<DownloadsSettings onBack={onBack} />, { route: '/ajustes/descargas' })

    expect(await screen.findByText('Aún no hay rutas descargadas.')).toBeInTheDocument()
  })

  it('abre una ruta descargada desde Ajustes', async () => {
    const store = createMemoryRouteStore()
    setOfflineRouteStore(store)
    await store.put(savedRoute(7))
    renderWithProviders(<DownloadsSettings onBack={onBack} />, { route: '/ajustes/descargas' })

    expect(await screen.findByRole('heading', { name: 'Ruta de los jardines' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver ficha' })).toHaveAttribute('href', '/rutas/7')
  })
})
