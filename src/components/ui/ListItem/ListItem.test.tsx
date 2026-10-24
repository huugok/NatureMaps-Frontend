import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { ListItem } from './ListItem'

describe('ListItem', () => {
  it('con "to" es un enlace', () => {
    render(
      <MemoryRouter>
        <ListItem title="Ajustes" subtitle="Idioma y modo" to="/ajustes" />
      </MemoryRouter>,
    )
    const link = screen.getByRole('link', { name: /ajustes/i })
    expect(link).toHaveAttribute('href', '/ajustes')
    expect(screen.getByText('Idioma y modo')).toBeInTheDocument()
  })

  it('con onClick es un botón', () => {
    const onClick = vi.fn()
    render(<ListItem title="Elegir" onClick={onClick} />)
    fireEvent.click(screen.getByRole('button', { name: 'Elegir' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('sin acción es solo texto y muestra el contenido trailing', () => {
    render(<ListItem title="Info" trailing={<span>derecha</span>} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.getByText('derecha')).toBeInTheDocument()
  })
})
