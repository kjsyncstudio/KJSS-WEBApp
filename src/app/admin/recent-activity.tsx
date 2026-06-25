'use client'

import { useState } from 'react'
import Link from 'next/link'

type Entry = {
  id: string
  user_email: string
  action: string
  entity_type: string
  entity_id: string | null
  entity_name: string | null
  created_at: string
  metadata?: Record<string, unknown> | null
}

const FIELD_LABELS: Record<string, string> = {
  notes: 'Notes', sheet: 'Sheet', description: 'Description', title: 'Title',
  image: 'Image', link: 'Download link', finalurl: 'Final URL', type: 'Type', date: 'Date',
}

// Human description of what an audit entry represents
function describe(e: Entry): string {
  const m = e.metadata as Record<string, unknown> | null | undefined
  if (m?.new_status) return `status: ${m.old_status ?? '—'} → ${m.new_status}`
  if (m?.old_role) return `role: ${m.old_role} → ${m.new_role}`
  if (m?.kind === 'fields' && Array.isArray(m.fields)) {
    return (m.fields as string[]).map(f => `${FIELD_LABELS[f] ?? f} modified`).join(', ')
  }
  return `${e.action.replace('_', ' ')} ${e.entity_type}`
}

const actionColor: Record<string, string> = {
  create: 'text-green-500',
  update: 'text-blue-500',
  delete: 'text-red-500',
  role_change: 'text-purple-500',
  invite: 'text-amber-500',
}

const CHANGE_ACTIONS = ['create', 'update', 'delete', 'role_change', 'invite']
const CHANGE_ENTITIES = ['project', 'user', 'client']
// "Changes" = a project was modified, or a user added/modified/deleted
const isChange = (e: Entry) => CHANGE_ACTIONS.includes(e.action) && CHANGE_ENTITIES.includes(e.entity_type)

export function RecentActivity({ entries }: { entries: Entry[] }) {
  const [tab, setTab] = useState<'all' | 'changes'>('all')
  const shown = tab === 'changes' ? entries.filter(isChange) : entries

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">Recent Activity</h3>
        <div className="flex gap-1 bg-secondary/40 rounded-lg p-1 text-xs">
          {(['all', 'changes'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-1 rounded-md font-medium capitalize transition-colors ${tab === t ? 'bg-background shadow-sm' : 'text-muted-foreground hover:bg-background/50'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>
      <div className="glass rounded-2xl border border-border/50 divide-y divide-border/30">
        {shown.length === 0 && <p className="px-4 py-6 text-center text-sm text-muted-foreground">No {tab === 'changes' ? 'changes' : 'activity'} yet.</p>}
        {shown.map(e => (
          <div key={e.id} className="flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted/10">
            <span className="text-muted-foreground tabular-nums whitespace-nowrap w-32 shrink-0">
              {new Date(e.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className="font-semibold truncate max-w-[10rem] shrink-0">{e.entity_name ?? e.entity_type}</span>
            <span className={`truncate flex-1 ${actionColor[e.action] ?? 'text-muted-foreground'}`}>{describe(e)}</span>
            <span className="text-muted-foreground truncate hidden sm:block max-w-[12rem]">{e.user_email}</span>
            {e.entity_type === 'project' && e.entity_id && (
              <Link href={`/projects/${e.entity_id}`} className="text-primary hover:underline shrink-0">view</Link>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
