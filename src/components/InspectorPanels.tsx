import { useMemo, useCallback, useState, useRef } from 'react'
import type { ComponentType, SVGAttributes } from 'react'
import type { VaultEntry, GitCommit } from '../types'
import {
  Wrench, Flask, Target, ArrowsClockwise,
  Users, CalendarBlank, Tag, FileText, StackSimple, Trash,
} from '@phosphor-icons/react'
import type { ParsedFrontmatter } from '../utils/frontmatter'
import { RELATIONSHIP_KEYS, containsWikilinks } from './DynamicPropertiesPanel'
import { getTypeColor, getTypeLightColor } from '../utils/typeColors'
import type { FrontmatterValue } from './Inspector'

const TYPE_ICON_MAP: Record<string, ComponentType<SVGAttributes<SVGSVGElement>>> = {
  Project: Wrench, Experiment: Flask, Responsibility: Target,
  Procedure: ArrowsClockwise, Person: Users, Event: CalendarBlank,
  Topic: Tag, Type: StackSimple,
}

function getTypeIcon(isA: string | undefined): ComponentType<SVGAttributes<SVGSVGElement>> {
  return (isA && TYPE_ICON_MAP[isA]) || FileText
}

function isWikilink(value: string): boolean {
  return /^\[\[.*\]\]$/.test(value)
}

function wikilinkDisplay(ref: string): string {
  const inner = ref.replace(/^\[\[|\]\]$/g, '')
  const pipeIdx = inner.indexOf('|')
  if (pipeIdx !== -1) return inner.slice(pipeIdx + 1)
  const last = inner.split('/').pop() ?? inner
  return last.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function wikilinkTarget(ref: string): string {
  const inner = ref.replace(/^\[\[|\]\]$/g, '')
  const pipeIdx = inner.indexOf('|')
  return pipeIdx !== -1 ? inner.slice(0, pipeIdx) : inner
}

function resolveRef(ref: string, entries: VaultEntry[]): VaultEntry | undefined {
  const target = wikilinkTarget(ref)
  return entries.find((e) => {
    const stem = e.path.replace(/^.*\/Laputa\//, '').replace(/\.md$/, '')
    if (stem === target) return true
    return e.filename.replace(/\.md$/, '') === target.split('/').pop()
  })
}

function LinkButton({ label, typeColor, bgColor, isArchived, isTrashed, onClick, title, TypeIcon }: {
  label: string
  typeColor: string
  bgColor?: string
  isArchived: boolean
  isTrashed: boolean
  onClick: () => void
  title?: string
  TypeIcon: ComponentType<SVGAttributes<SVGSVGElement>>
}) {
  const isDimmed = isArchived || isTrashed
  const color = isDimmed ? 'var(--muted-foreground)' : typeColor
  return (
    <button
      className="flex items-center justify-between gap-2 border-none text-left cursor-pointer hover:opacity-80"
      style={{
        background: isDimmed ? 'var(--muted)' : (bgColor ?? 'transparent'),
        color, borderRadius: 6, padding: bgColor ? '6px 10px' : '4px 0',
        fontSize: 12, fontWeight: 500, opacity: isDimmed ? 0.7 : 1,
      }}
      onClick={onClick}
      title={title}
    >
      <span className="flex items-center gap-1 flex-1 truncate">
        {isTrashed && <Trash size={12} className="shrink-0" />}
        {label}
        {isTrashed && <span style={{ fontSize: 10, opacity: 0.8 }}>(trashed)</span>}
        {isArchived && !isTrashed && <span style={{ marginLeft: 4, fontSize: 10, opacity: 0.8 }}>(archived)</span>}
      </span>
      <TypeIcon width={14} height={14} className="shrink-0" style={{ color }} />
    </button>
  )
}

function resolveRefProps(ref: string, entries: VaultEntry[]) {
  const resolved = resolveRef(ref, entries)
  const refType = resolved?.isA ?? undefined
  return {
    label: wikilinkDisplay(ref),
    typeColor: refType ? getTypeColor(refType) : 'var(--accent-blue)',
    bgColor: refType ? getTypeLightColor(refType) : 'var(--accent-blue-light)',
    isArchived: resolved?.archived ?? false,
    isTrashed: resolved?.trashed ?? false,
    target: wikilinkTarget(ref),
    title: resolved?.trashed ? 'Trashed' : resolved?.archived ? 'Archived' : undefined,
    TypeIcon: getTypeIcon(refType),
  }
}

function RelationshipGroup({ label, refs, entries, onNavigate }: {
  label: string; refs: string[]; entries: VaultEntry[]; onNavigate: (target: string) => void
}) {
  if (refs.length === 0) return null
  return (
    <div className="mb-2.5">
      <span className="font-mono-overline mb-1 block text-muted-foreground">{label}</span>
      <div className="flex flex-col gap-1">
        {refs.map((ref, idx) => {
          const props = resolveRefProps(ref, entries)
          return <LinkButton key={`${ref}-${idx}`} {...props} onClick={() => onNavigate(props.target)} />
        })}
      </div>
    </div>
  )
}

function extractRelationshipRefs(frontmatter: ParsedFrontmatter): { key: string; refs: string[] }[] {
  return Object.entries(frontmatter)
    .filter(([key, value]) => key !== 'Type' && (RELATIONSHIP_KEYS.has(key) || containsWikilinks(value)))
    .map(([key, value]) => {
      const refs: string[] = []
      if (typeof value === 'string' && isWikilink(value)) refs.push(value)
      else if (Array.isArray(value)) value.forEach(v => { if (typeof v === 'string' && isWikilink(v)) refs.push(v) })
      return { key, refs }
    })
    .filter(({ refs }) => refs.length > 0)
}

function AddRelationshipForm({ entries, onAddProperty }: {
  entries: VaultEntry[]
  onAddProperty: (key: string, value: FrontmatterValue) => void
}) {
  const [relKey, setRelKey] = useState('')
  const [relTarget, setRelTarget] = useState('')
  const [showForm, setShowForm] = useState(false)
  const keyInputRef = useRef<HTMLInputElement>(null)
  const noteTitles = useMemo(() => entries.map(e => e.title), [entries])

  const handleAdd = useCallback(() => {
    const key = relKey.trim()
    const target = relTarget.trim()
    if (!key || !target) return
    onAddProperty(key, `[[${target}]]`)
    setRelKey(''); setRelTarget(''); setShowForm(false)
  }, [relKey, relTarget, onAddProperty])

  const resetForm = () => { setShowForm(false); setRelKey(''); setRelTarget('') }
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAdd()
    else if (e.key === 'Escape') resetForm()
  }

  if (!showForm) {
    return (
      <button className="mt-2 w-full border border-border bg-transparent text-center text-muted-foreground" style={{ borderRadius: 6, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }} onClick={() => { setShowForm(true); setTimeout(() => keyInputRef.current?.focus(), 0) }}>+ Link existing</button>
    )
  }

  return (
    <div className="mt-2 flex flex-col gap-1.5" onKeyDown={handleKeyDown}>
      <datalist id="rel-note-titles">{noteTitles.map(t => <option key={t} value={t} />)}</datalist>
      <input ref={keyInputRef} autoFocus className="w-full border border-border bg-transparent px-2 py-1 text-xs text-foreground" style={{ borderRadius: 4, outline: 'none' }} placeholder="Relationship name" value={relKey} onChange={e => setRelKey(e.target.value)} />
      <input className="w-full border border-border bg-transparent px-2 py-1 text-xs text-foreground" style={{ borderRadius: 4, outline: 'none' }} placeholder="Note title" list="rel-note-titles" value={relTarget} onChange={e => setRelTarget(e.target.value)} />
      <div className="flex gap-1.5">
        <button className="flex-1 border border-border bg-transparent text-xs text-foreground" style={{ borderRadius: 4, padding: '4px 0' }} onClick={handleAdd} disabled={!relKey.trim() || !relTarget.trim()}>Add</button>
        <button className="border border-border bg-transparent text-xs text-muted-foreground" style={{ borderRadius: 4, padding: '4px 8px' }} onClick={resetForm}>Cancel</button>
      </div>
    </div>
  )
}

export function DynamicRelationshipsPanel({ frontmatter, entries, onNavigate, onAddProperty }: {
  frontmatter: ParsedFrontmatter; entries: VaultEntry[]; onNavigate: (target: string) => void; onAddProperty?: (key: string, value: FrontmatterValue) => void
}) {
  const relationshipEntries = useMemo(() => extractRelationshipRefs(frontmatter), [frontmatter])
  return (
    <div>
      {relationshipEntries.length === 0
        ? <p className="m-0 text-[13px] text-muted-foreground">No relationships</p>
        : relationshipEntries.map(({ key, refs }) => <RelationshipGroup key={key} label={key} refs={refs} entries={entries} onNavigate={onNavigate} />)
      }
      {onAddProperty
        ? <AddRelationshipForm entries={entries} onAddProperty={onAddProperty} />
        : <button className="mt-2 w-full border border-border bg-transparent text-center text-muted-foreground" style={{ borderRadius: 6, padding: '6px 12px', fontSize: 12, opacity: 0.5, cursor: 'not-allowed' }} disabled>+ Link existing</button>
      }
    </div>
  )
}

export function BacklinksPanel({ backlinks, onNavigate }: { backlinks: VaultEntry[]; onNavigate: (target: string) => void }) {
  return (
    <div>
      <h4 className="font-mono-overline mb-2 text-muted-foreground">
        Backlinks {backlinks.length > 0 && <span className="ml-1" style={{ fontWeight: 400 }}>{backlinks.length}</span>}
      </h4>
      {backlinks.length === 0
        ? <p className="m-0 text-[13px] text-muted-foreground">No backlinks</p>
        : (
          <div className="flex flex-col gap-0.5">
            {backlinks.map((e) => (
              <LinkButton key={e.path} label={e.title} typeColor={e.isA ? getTypeColor(e.isA) : 'var(--accent-blue)'} isArchived={e.archived} isTrashed={e.trashed} onClick={() => onNavigate(e.title)} title={e.trashed ? 'Trashed' : e.archived ? 'Archived' : undefined} TypeIcon={getTypeIcon(e.isA ?? undefined)} />
            ))}
          </div>
        )
      }
    </div>
  )
}

function formatRelativeDate(timestamp: number): string {
  const now = Math.floor(Date.now() / 1000)
  const days = Math.floor((now - timestamp) / 86400)
  if (days < 1) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return months === 1 ? '1mo ago' : `${months}mo ago`
}

export function GitHistoryPanel({ commits, onViewCommitDiff }: { commits: GitCommit[]; onViewCommitDiff?: (commitHash: string) => void }) {
  return (
    <div>
      <h4 className="font-mono-overline mb-2 text-muted-foreground">History</h4>
      {commits.length === 0
        ? <p className="m-0 text-[13px] text-muted-foreground">No revision history</p>
        : (
          <div className="flex flex-col gap-2.5">
            {commits.map((c) => (
              <div key={c.hash} style={{ borderLeft: '2px solid var(--border)', paddingLeft: 10 }}>
                <div className="mb-0.5 flex items-center justify-between">
                  <button className="border-none bg-transparent p-0 font-mono text-primary cursor-pointer hover:underline" style={{ fontSize: 11 }} onClick={() => onViewCommitDiff?.(c.hash)} title={`View diff for ${c.shortHash}`}>{c.shortHash}</button>
                  <span className="text-muted-foreground" style={{ fontSize: 10 }}>{formatRelativeDate(c.date)}</span>
                </div>
                <div className="truncate text-xs text-secondary-foreground">{c.message}</div>
                {c.author && <div className="truncate text-muted-foreground" style={{ fontSize: 10, marginTop: 1 }}>{c.author}</div>}
              </div>
            ))}
          </div>
        )
      }
    </div>
  )
}
