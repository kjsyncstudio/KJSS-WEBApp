'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Project = {
  id: string
  title: string
  type: string
  status: string
  description: string | null
  clients?: { name: string } | null
}

type Change = {
  id: string
  user_email: string
  entity_id: string | null
  entity_name: string | null
  created_at: string
}

// Fast typewriter for the welcome line only
function Typewriter({ text, speed = 16, delay = 0, className }: { text: string; speed?: number; delay?: number; className?: string }) {
  const [out, setOut] = useState('')
  useEffect(() => {
    let i = 0
    let iv: ReturnType<typeof setInterval> | undefined
    const start = setTimeout(() => {
      iv = setInterval(() => {
        i++
        setOut(text.slice(0, i))
        if (i >= text.length && iv) clearInterval(iv)
      }, speed)
    }, delay)
    return () => { clearTimeout(start); if (iv) clearInterval(iv) }
  }, [text, speed, delay])
  return <span className={className}>{out}</span>
}

const statusColors: Record<string, string> = {
  Active: 'bg-green-500/10 text-green-500 border-green-500/20',
  Expedite: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
  Completed: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  Done: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  Pending: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20',
}
const badge = (s: string) => statusColors[s] ?? statusColors.Pending

const barColor: Record<string, string> = {
  Active: 'bg-green-500', Expedite: 'bg-amber-500', Pending: 'bg-zinc-400', Completed: 'bg-blue-500', Done: 'bg-blue-500',
}
const barOf = (s: string) => barColor[s] ?? 'bg-zinc-500'
const STATUS_ORDER = ['Active', 'Pending', 'Expedite', 'Completed']

export function DashboardClient({
  name, isAdmin, activeProjects, counts, statusCounts, recentChanges,
}: {
  name: string
  isAdmin: boolean
  activeProjects: Project[]
  counts: { active: number; clients: number; pending: number }
  statusCounts: Record<string, number>
  recentChanges: Change[]
}) {
  const router = useRouter()
  const [showActions, setShowActions] = useState(false)
  useEffect(() => { setShowActions(localStorage.getItem('dashQuickActions') === '1') }, [])
  const toggleActions = () => setShowActions(v => { localStorage.setItem('dashQuickActions', v ? '0' : '1'); return !v })

  const stats = [
    { label: 'Active Projects', value: counts.active },
    { label: isAdmin ? 'Clients' : 'My Clients', value: counts.clients },
    { label: 'Pending', value: counts.pending },
  ]

  // ordered status segments (known order first, then any custom statuses)
  const total = Object.values(statusCounts).reduce((a, b) => a + b, 0)
  const segments = [...STATUS_ORDER, ...Object.keys(statusCounts).filter(s => !STATUS_ORDER.includes(s))]
    .filter(s => statusCounts[s] > 0)
    .map(s => ({ status: s, count: statusCounts[s] }))

  return (
    <>
      <div className="mb-8">
        <h2 className="text-3xl font-bold tracking-tight dash-in">Welcome, {name}</h2>
        <p className="text-muted-foreground mt-2 min-h-[1.5rem]">
          <Typewriter text="Here's an overview of your active work." delay={250} />
        </p>
      </div>

      {isAdmin && (
        <div className="glass p-6 rounded-2xl border-border/50 mb-8 bg-primary/5 dash-in" style={{ animationDelay: '120ms' }}>
          <h3 className="text-xl font-semibold mb-2">Admin Controls</h3>
          <p className="text-sm text-muted-foreground mb-4">Full access to manage clients, projects, and users.</p>
          <Link href="/admin" className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium text-sm hover:bg-primary/90 transition-colors">
            Manage Members
          </Link>
        </div>
      )}

      {/* Quick actions — admin only, hidden by default */}
      {isAdmin && (
        <div className="mb-8 dash-in" style={{ animationDelay: '140ms' }}>
          <button onClick={toggleActions}
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
            <span className={`transition-transform ${showActions ? 'rotate-90' : ''}`}>▸</span> Quick actions
          </button>
          {showActions && (
            <div className="flex flex-wrap gap-3 mt-3">
              <Link href="/projects" className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors">+ New Project</Link>
              <Link href="/projects/batch" className="border border-border px-4 py-2 rounded-md text-sm font-medium hover:bg-muted/50 transition-colors">Batch Add</Link>
              <Link href="/clients" className="border border-border px-4 py-2 rounded-md text-sm font-medium hover:bg-muted/50 transition-colors">+ New Client</Link>
            </div>
          )}
        </div>
      )}

      {/* Status breakdown */}
      {total > 0 && (
        <div className="glass p-5 rounded-2xl border-border/50 mb-8 dash-in" style={{ animationDelay: '160ms' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-sm text-muted-foreground">Status Breakdown</h3>
            <span className="text-xs text-muted-foreground">{total} project{total !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex h-2.5 rounded-full overflow-hidden bg-muted/30">
            {segments.map(s => (
              <div key={s.status} className={barOf(s.status)} style={{ width: `${(s.count / total) * 100}%` }} title={`${s.status}: ${s.count}`} />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
            {segments.map(s => (
              <span key={s.status} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className={`w-2.5 h-2.5 rounded-full ${barOf(s.status)}`} />
                {s.status} <span className="tabular-nums font-medium text-foreground">{s.count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid gap-6 md:grid-cols-3 mb-10">
        {stats.map((s, i) => (
          <div key={s.label} className="glass p-6 rounded-2xl border-border/50 flex flex-col gap-2 dash-in"
            style={{ animationDelay: `${180 + i * 90}ms` }}>
            <h3 className="font-medium text-muted-foreground text-sm">{s.label}</h3>
            <span className="text-4xl font-bold tabular-nums">{s.value}</span>
          </div>
        ))}
      </div>

      {/* Active projects — compact list */}
      <div className="flex items-center justify-between mb-4 dash-in" style={{ animationDelay: '420ms' }}>
        <h3 className="text-xl font-semibold">Active Projects</h3>
        <Link href="/projects" className="text-sm text-primary hover:underline">View all →</Link>
      </div>

      {activeProjects.length === 0 ? (
        <div className="glass p-10 rounded-2xl border-border/50 text-center text-muted-foreground dash-in" style={{ animationDelay: '480ms' }}>
          No active projects right now.
        </div>
      ) : (
        <div className="glass rounded-2xl border border-border/50 divide-y divide-border/30 overflow-hidden dash-in" style={{ animationDelay: '480ms' }}>
          {activeProjects.map(p => {
            const expedite = p.status === 'Expedite'
            return (
              <button key={p.id} onClick={() => router.push(`/projects/${p.id}`)}
                className={`w-full text-left flex items-center gap-3 px-4 py-2.5 transition-colors ${expedite ? 'bg-amber-400/10 hover:bg-amber-400/15' : 'hover:bg-muted/10'}`}>
                <span className="font-medium truncate flex-1 min-w-0">{p.title}</span>
                <span className="text-xs text-muted-foreground hidden sm:block truncate max-w-[10rem]">{p.clients?.name ?? '—'}</span>
                <span className="text-xs text-muted-foreground hidden md:block truncate max-w-[14rem]">{p.description || '—'}</span>
                <span className="text-xs text-muted-foreground hidden lg:block">{p.type}</span>
                <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badge(p.status)}`}>{p.status}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Recent changes — admin only */}
      {isAdmin && (
        <div className="mt-10 dash-in" style={{ animationDelay: '560ms' }}>
          <h3 className="text-xl font-semibold mb-4">Recent Changes</h3>
          {recentChanges.length === 0 ? (
            <div className="glass p-6 rounded-2xl border-border/50 text-center text-sm text-muted-foreground">No recent changes.</div>
          ) : (
            <div className="glass rounded-2xl border border-border/50 divide-y divide-border/30">
              {recentChanges.map(c => (
                <div key={c.id} className="flex items-center gap-2 px-4 py-2 text-xs hover:bg-muted/10">
                  <span className="text-muted-foreground tabular-nums whitespace-nowrap w-28 shrink-0">
                    {new Date(c.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="text-muted-foreground shrink-0">edited</span>
                  <span className="font-medium truncate flex-1">{c.entity_name ?? '—'}</span>
                  <span className="text-muted-foreground truncate hidden sm:block max-w-[12rem]">{c.user_email}</span>
                  {c.entity_id && <Link href={`/projects/${c.entity_id}`} className="text-primary hover:underline shrink-0">view</Link>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes dash-in {
          from { opacity: 0; transform: translateY(-10px); filter: blur(4px); }
          to   { opacity: 1; transform: translateY(0); filter: blur(0); }
        }
        .dash-in { opacity: 0; animation: dash-in 0.5s cubic-bezier(0.22,1,0.36,1) both; }
      `}</style>
    </>
  )
}
