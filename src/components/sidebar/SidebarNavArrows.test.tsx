import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { SidebarNavArrows } from './SidebarNavArrows'

function renderArrows(props: Partial<React.ComponentProps<typeof SidebarNavArrows>> = {}) {
  const defaults = {
    canGoBack: true,
    canGoForward: true,
    onGoBack: vi.fn(),
    onGoForward: vi.fn(),
  }
  const merged = { ...defaults, ...props }
  return {
    ...render(
      <TooltipProvider>
        <SidebarNavArrows {...merged} />
      </TooltipProvider>,
    ),
    props: merged,
  }
}

describe('SidebarNavArrows', () => {
  it('renders back and forward buttons with default English aria-labels', () => {
    renderArrows()
    expect(screen.getByRole('button', { name: 'Back' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Forward' })).toBeTruthy()
  })

  it('renders Simplified Chinese aria-labels when locale=zh-Hans', () => {
    renderArrows({ locale: 'zh-Hans' })
    expect(screen.getByRole('button', { name: '后退' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '前进' })).toBeTruthy()
  })

  it('calls onGoBack when back is clicked', () => {
    const { props } = renderArrows()
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(props.onGoBack).toHaveBeenCalledOnce()
  })

  it('calls onGoForward when forward is clicked', () => {
    const { props } = renderArrows()
    fireEvent.click(screen.getByRole('button', { name: 'Forward' }))
    expect(props.onGoForward).toHaveBeenCalledOnce()
  })

  it('disables back button when canGoBack is false and does not invoke handler', () => {
    const { props } = renderArrows({ canGoBack: false })
    const back = screen.getByRole('button', { name: 'Back' }) as HTMLButtonElement
    expect(back.disabled).toBe(true)
    fireEvent.click(back)
    expect(props.onGoBack).not.toHaveBeenCalled()
  })

  it('disables forward button when canGoForward is false and does not invoke handler', () => {
    const { props } = renderArrows({ canGoForward: false })
    const forward = screen.getByRole('button', { name: 'Forward' }) as HTMLButtonElement
    expect(forward.disabled).toBe(true)
    fireEvent.click(forward)
    expect(props.onGoForward).not.toHaveBeenCalled()
  })

  it('marks both buttons with data-no-drag so the surrounding drag region does not swallow clicks', () => {
    renderArrows()
    expect(screen.getByRole('button', { name: 'Back' }).hasAttribute('data-no-drag')).toBe(true)
    expect(screen.getByRole('button', { name: 'Forward' }).hasAttribute('data-no-drag')).toBe(true)
  })
})
