import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { SidebarTitleBar } from './SidebarSections'

function renderTitleBar(overrides: Partial<React.ComponentProps<typeof SidebarTitleBar>> = {}) {
  const props = {
    canGoBack: true,
    canGoForward: true,
    onGoBack: vi.fn(),
    onGoForward: vi.fn(),
    onCollapse: vi.fn(),
    ...overrides,
  }
  return {
    ...render(
      <TooltipProvider>
        <SidebarTitleBar {...props} />
      </TooltipProvider>,
    ),
    props,
  }
}

describe('SidebarTitleBar', () => {
  it('renders the nav arrows and the collapse button together', () => {
    renderTitleBar()
    expect(screen.getByTestId('sidebar-nav-arrows')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Back' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Forward' })).toBeTruthy()
    expect(screen.getByLabelText('Collapse sidebar')).toBeTruthy()
  })

  it('forwards back/forward clicks to handlers', () => {
    const { props } = renderTitleBar()
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    fireEvent.click(screen.getByRole('button', { name: 'Forward' }))
    expect(props.onGoBack).toHaveBeenCalledOnce()
    expect(props.onGoForward).toHaveBeenCalledOnce()
  })

  it('still triggers collapse when the collapse button is clicked', () => {
    const { props } = renderTitleBar()
    fireEvent.click(screen.getByLabelText('Collapse sidebar'))
    expect(props.onCollapse).toHaveBeenCalledOnce()
  })

  it('hides the collapse button when onCollapse is not provided but still shows arrows', () => {
    renderTitleBar({ onCollapse: undefined })
    expect(screen.getByTestId('sidebar-nav-arrows')).toBeTruthy()
    expect(screen.queryByLabelText('Collapse sidebar')).toBeNull()
  })
})
