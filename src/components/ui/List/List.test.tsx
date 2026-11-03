import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { List } from './List'

describe('List', () => {
  it('renderiza sus hijos y acepta role', () => {
    render(
      <List role="radiogroup">
        <span>Uno</span>
      </List>,
    )
    expect(screen.getByRole('radiogroup')).toContainElement(screen.getByText('Uno'))
  })
})
