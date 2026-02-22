import { useMemo, useCallback } from 'react'
import type { VaultEntry, GitCommit } from '../types'
import { cn } from '@/lib/utils'
import { SlidersHorizontal, X } from '@phosphor-icons/react'
import { parseFrontmatter } from '../utils/frontmatter'
import { DynamicPropertiesPanel } from './DynamicPropertiesPanel'
import { DynamicRelationshipsPanel, BacklinksPanel, GitHistoryPanel } from './InspectorPanels'

export type FrontmatterValue = string | number | boolean | string[] | null

interface InspectorProps {
  collapsed: boolean
  onToggle: () => void
  entry: VaultEntry | null
  content: string | null
  entries: VaultEntry[]
  allContent: Record<string, string>
  gitHistory: GitCommit[]
  onNavigate: (target: string) => void
  onViewCommitDiff?: (commitHash: string) => void
  onUpdateFrontmatter?: (path: string, key: string, value: FrontmatterValue) => Promise<void>
  onDeleteProperty?: (path: string, key: string) => Promise<void>
  onAddProperty?: (path: string, key: string, value: FrontmatterValue) => Promise<void>
}

function useBacklinks(entry: VaultEntry | null, entries: VaultEntry[], allContent: Record<string, string>): VaultEntry[] {
  return useMemo(() => {
    if (!entry) return []
    const targets = [entry.title, ...entry.aliases]
    const stem = entry.filename.replace(/\.md$/, '')
    const pathStem = entry.path.replace(/^.*\/Laputa\//, '').replace(/\.md$/, '')

    return entries.filter((e) => {
      if (e.path === entry.path) return false
      const c = allContent[e.path]
      if (!c) return false
      for (const t of targets) { if (c.includes(`[[${t}]]`)) return true }
      return c.includes(`[[${stem}]]`) || c.includes(`[[${pathStem}]]`) || c.includes(`[[${pathStem}|`)
    })
  }, [entry, entries, allContent])
}

function InspectorHeader({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center border-b border-border" style={{ height: 45, padding: '0 12px', gap: 8 }} data-tauri-drag-region>
      {collapsed ? (
        <button className="shrink-0 border-none bg-transparent p-1 text-muted-foreground cursor-pointer hover:text-foreground" onClick={onToggle} style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <SlidersHorizontal size={16} />
        </button>
      ) : (
        <>
          <SlidersHorizontal size={16} className="shrink-0 text-muted-foreground" />
          <span className="flex-1 text-muted-foreground" style={{ fontSize: 13, fontWeight: 600 }}>Properties</span>
          <button className="shrink-0 border-none bg-transparent p-1 text-muted-foreground cursor-pointer hover:text-foreground" onClick={onToggle} style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
            <X size={16} />
          </button>
        </>
      )}
    </div>
  )
}

function EmptyInspector() {
  return (
    <>
      <div><p className="m-0 text-[13px] text-muted-foreground">No note selected</p></div>
      <div><p className="m-0 text-[13px] text-muted-foreground">No relationships</p></div>
      <div>
        <h4 className="font-mono-overline mb-2 text-muted-foreground">Backlinks</h4>
        <p className="m-0 text-[13px] text-muted-foreground">No backlinks</p>
      </div>
      <div>
        <h4 className="font-mono-overline mb-2 text-muted-foreground">History</h4>
        <p className="m-0 text-[13px] text-muted-foreground">No revision history</p>
      </div>
    </>
  )
}

export function Inspector({
  collapsed, onToggle, entry, content, entries, allContent, gitHistory, onNavigate,
  onViewCommitDiff, onUpdateFrontmatter, onDeleteProperty, onAddProperty,
}: InspectorProps) {
  const backlinks = useBacklinks(entry, entries, allContent)
  const frontmatter = useMemo(() => parseFrontmatter(content), [content])

  const handleUpdateProperty = useCallback((key: string, value: FrontmatterValue) => {
    if (entry && onUpdateFrontmatter) onUpdateFrontmatter(entry.path, key, value)
  }, [entry, onUpdateFrontmatter])

  const handleDeleteProperty = useCallback((key: string) => {
    if (entry && onDeleteProperty) onDeleteProperty(entry.path, key)
  }, [entry, onDeleteProperty])

  const handleAddProperty = useCallback((key: string, value: FrontmatterValue) => {
    if (entry && onAddProperty) onAddProperty(entry.path, key, value)
  }, [entry, onAddProperty])

  return (
    <aside className={cn("flex flex-1 flex-col overflow-y-auto border-l border-border bg-background text-foreground transition-[width] duration-200", collapsed && "!w-10 !min-w-10")}>
      <InspectorHeader collapsed={collapsed} onToggle={onToggle} />
      {!collapsed && (
        <div className="flex flex-col gap-4 p-3">
          {entry ? (
            <>
              <DynamicPropertiesPanel
                entry={entry} content={content} frontmatter={frontmatter}
                onUpdateProperty={onUpdateFrontmatter ? handleUpdateProperty : undefined}
                onDeleteProperty={onDeleteProperty ? handleDeleteProperty : undefined}
                onAddProperty={onAddProperty ? handleAddProperty : undefined}
                onNavigate={onNavigate}
              />
              <DynamicRelationshipsPanel frontmatter={frontmatter} entries={entries} onNavigate={onNavigate} onAddProperty={onAddProperty ? handleAddProperty : undefined} />
              <BacklinksPanel backlinks={backlinks} onNavigate={onNavigate} />
              <GitHistoryPanel commits={gitHistory} onViewCommitDiff={onViewCommitDiff} />
            </>
          ) : (
            <EmptyInspector />
          )}
        </div>
      )}
    </aside>
  )
}
