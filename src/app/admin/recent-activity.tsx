import Link from 'next/link'

type Entry = {
  id: string
  user_email: string
  action: string
  entity_type: string
  entity_id: string | null
  entity_name: string | null
  created_at: string
}

const actionColor: Record<string, string> = {
  create: 'text-green-500',
  update: 'text-blue-500',
  delete: 'text-red-500',
  role_change: 'text-purple-500',
  invite: 'text-amber-500',
}

export function RecentActivity({ entries }: { entries: Entry[] }) {
  return (
    <section className="space-y-3">
      <h3 className="text-xl font-semibold">Recent Activity</h3>
      <div className="glass rounded-2xl border border-border/50 divide-y divide-border/30">
        {entries.length === 0 && <p className="px-4 py-6 text-center text-sm text-muted-foreground">No activity yet.</p>}
        {entries.map(e => (
          <div key={e.id} className="flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted/10">
            <span className="text-muted-foreground tabular-nums whitespace-nowrap w-32 shrink-0">
              {new Date(e.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className={`font-semibold capitalize w-16 shrink-0 ${actionColor[e.action] ?? ''}`}>{e.action.replace('_', ' ')}</span>
            <span className="text-muted-foreground shrink-0">{e.entity_type}</span>
            <span className="font-medium truncate flex-1">{e.entity_name ?? '—'}</span>
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
