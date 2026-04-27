import { CaretLeft, CaretRight } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { ActionTooltip } from '@/components/ui/action-tooltip'
import { translate, type AppLocale } from '../../lib/i18n'
import { APP_COMMAND_IDS, getAppCommandShortcutDisplay } from '../../hooks/appCommandCatalog'

interface SidebarNavArrowsProps {
  canGoBack: boolean
  canGoForward: boolean
  onGoBack: () => void
  onGoForward: () => void
  locale?: AppLocale
}

export function SidebarNavArrows({
  canGoBack,
  canGoForward,
  onGoBack,
  onGoForward,
  locale = 'en',
}: SidebarNavArrowsProps) {
  const backLabel = translate(locale, 'sidebar.nav.back')
  const forwardLabel = translate(locale, 'sidebar.nav.forward')
  const backShortcut = getAppCommandShortcutDisplay(APP_COMMAND_IDS.viewGoBack)
  const forwardShortcut = getAppCommandShortcutDisplay(APP_COMMAND_IDS.viewGoForward)

  return (
    <div className="flex items-center gap-1" data-testid="sidebar-nav-arrows">
      <ActionTooltip copy={{ label: backLabel, shortcut: backShortcut }} side="bottom">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          disabled={!canGoBack}
          onClick={onGoBack}
          aria-label={backLabel}
          data-no-drag
          data-testid="sidebar-nav-back"
        >
          <CaretLeft size={14} weight="bold" />
        </Button>
      </ActionTooltip>
      <ActionTooltip copy={{ label: forwardLabel, shortcut: forwardShortcut }} side="bottom">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          disabled={!canGoForward}
          onClick={onGoForward}
          aria-label={forwardLabel}
          data-no-drag
          data-testid="sidebar-nav-forward"
        >
          <CaretRight size={14} weight="bold" />
        </Button>
      </ActionTooltip>
    </div>
  )
}
