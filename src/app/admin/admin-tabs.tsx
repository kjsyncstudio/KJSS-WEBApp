'use client'

import { useState } from 'react'
import { MembersPanel } from './members-panel'
import { ProjectSettingsPanel } from './project-settings-panel'
import { DeletedBin } from './deleted-bin'
import { RecentActivity } from './recent-activity'
import { PermissionsPanel } from './permissions-panel'
import { UnresolvedPanel } from './unresolved-panel'

type Member = { id: string; email: string; full_name: string | null; role: string; created_at: string }
type Entry = { id: string; user_email: string; action: string; entity_type: string; entity_id: string | null; entity_name: string | null; created_at: string }
type Deleted = { id: string; title: string; deleted_at: string; deleted_by?: string | null; clients?: { name: string } }
type Client = { id: string; name: string }
type Perm = { user_id: string; client_id: string; can_read: boolean; can_write: boolean }
type Unresolved = { id: string; title: string; status: string | null; client_id: string | null; clients?: { name: string } | null }

const TABS = ['Members', 'Permissions', 'Unresolved Projects', 'Project Settings', 'Deleted'] as const
type Tab = typeof TABS[number]

export function AdminTabs({ members, recentLog, statuses, types, deleted, clients, permissions, unresolved }: {
  members: Member[]
  recentLog: Entry[]
  statuses: string[]
  types: string[]
  deleted: Deleted[]
  clients: Client[]
  permissions: Perm[]
  unresolved: Unresolved[]
}) {
  const [tab, setTab] = useState<Tab>('Members')

  return (
    <div className="space-y-8">
      <div className="flex gap-1 border-b border-border/50">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}>
            {t}{t === 'Deleted' && deleted.length > 0 && <span className="ml-1.5 text-xs bg-destructive/15 text-destructive px-1.5 py-0.5 rounded-full">{deleted.length}</span>}
            {t === 'Unresolved Projects' && unresolved.length > 0 && <span className="ml-1.5 text-xs bg-amber-500/15 text-amber-600 px-1.5 py-0.5 rounded-full">{unresolved.length}</span>}
          </button>
        ))}
      </div>

      {tab === 'Members' && (
        <div className="space-y-8">
          <MembersPanel members={members} />
          <RecentActivity entries={recentLog} />
        </div>
      )}
      {tab === 'Permissions' && <PermissionsPanel members={members} clients={clients} permissions={permissions} />}
      {tab === 'Unresolved Projects' && <UnresolvedPanel projects={unresolved} clients={clients} statuses={statuses} />}
      {tab === 'Project Settings' && <ProjectSettingsPanel statuses={statuses} types={types} />}
      {tab === 'Deleted' && <DeletedBin projects={deleted} />}
    </div>
  )
}
