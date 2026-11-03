import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LocationPermissionPrompt } from './LocationPermissionPrompt'

describe('LocationPermissionPrompt', () => {
  it('explica el permiso y dispara los callbacks', () => {
    const onAllow = vi.fn()
    const onDeny = vi.fn()
    render(<LocationPermissionPrompt onAllow={onAllow} onDeny={onDeny} />)

    expect(screen.getByText('Para ver plantas cerca de ti')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Permitir ubicación' }))
    fireEvent.click(screen.getByRole('button', { name: 'Ahora no' }))

    expect(onAllow).toHaveBeenCalledTimes(1)
    expect(onDeny).toHaveBeenCalledTimes(1)
  })
})
