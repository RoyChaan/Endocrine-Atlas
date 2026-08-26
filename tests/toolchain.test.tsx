import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

function Probe({ label }: { label: string }) {
  return <p data-testid="probe">{label}</p>
}

describe('toolchain', () => {
  it('renders TSX through React + jsdom', () => {
    render(<Probe label="工具链正常" />)
    expect(screen.getByTestId('probe')).toBeInTheDocument()
    expect(screen.getByTestId('probe')).toHaveTextContent('工具链正常')
  })

  it('provides the jsdom polyfills that R3F needs', () => {
    expect(typeof globalThis.ResizeObserver).toBe('function')
    expect(typeof window.matchMedia).toBe('function')
  })
})
