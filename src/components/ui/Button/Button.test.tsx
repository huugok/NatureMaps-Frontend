import { fireEvent, render, screen } from '@testing-library/react'
import { MapPin } from 'lucide-react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { Button } from './Button'

describe('Button', () => {
  it('llama a onClick al pulsarlo', () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Guardar</Button>)
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('no se puede pulsar si está deshabilitado', () => {
    render(<Button disabled>Guardar</Button>)
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled()
  })

  it('con "to" se renderiza como enlace', () => {
    render(
      <MemoryRouter>
        <Button to="/inicio">Ir al inicio</Button>
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: 'Ir al inicio' })).toHaveAttribute('href', '/inicio')
  })

  it('con "to" conserva onClick', () => {
    const onClick = vi.fn()
    render(
      <MemoryRouter>
        <Button to="/inicio" onClick={onClick}>Ir al inicio</Button>
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('link', { name: 'Ir al inicio' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('con "to" y disabled no navega ni llama a onClick', () => {
    const onClick = vi.fn()
    render(
      <MemoryRouter>
        <Button to="/inicio" disabled onClick={onClick}>Ir al inicio</Button>
      </MemoryRouter>,
    )
    const link = screen.getByRole('link', { name: 'Ir al inicio' })
    expect(link).toHaveAttribute('aria-disabled', 'true')
    fireEvent.click(link)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('muestra el icono sin añadirlo al nombre accesible', () => {
    render(<Button icon={MapPin}>Cerca</Button>)
    expect(screen.getByRole('button', { name: 'Cerca' })).toBeInTheDocument()
  })
})
