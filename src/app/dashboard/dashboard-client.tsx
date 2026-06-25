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

// Fast typewriter for sub-texts / descriptions
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
  Done: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  Shelved: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  Pending: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20',
}

export function DashboardClient({
  name, role, isAdmin, activeProjects, counts,
}: {
  name: string
  role: string
  isAdmin: boolean
  activeProjects: Project[]
  counts: { active: number; clients: number; pending: number }
}) {
  const router = useRouter()

  const stats = [
    { label: 'Active Projects', value: counts.active },
    { label: isAdmin ? 'Clients' : 'My Clients', value: counts.clients },
    { label: 'Pending', value: counts.pending },
  ]

  return (
    <>
      <div className="mb-8">
        <h2 className="text-3xl font-bold tracking-tight dash-in" style={{ animationDelay: '0ms' }}>Welcome, {name}</h2>
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

      {/* Active projects */}
      <div className="flex items-center justify-between mb-4 dash-in" style={{ animationDelay: '420ms' }}>
        <h3 className="text-xl font-semibold">Active Projects</h3>
        <Link href="/projects" className="text-sm text-primary hover:underline">View all →</Link>
      </div>

      {activeProjects.length === 0 ? (
        <div className="glass p-10 rounded-2xl border-border/50 text-center text-muted-foreground dash-in" style={{ animationDelay: '480ms' }}>
          No active projects right now.
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {activeProjects.map((p, i) => (
            <button key={p.id} onClick={() => router.push(`/projects/${p.id}`)}
              className="text-left glass p-5 rounded-2xl border-border/50 flex flex-col group cursor-pointer dash-in
                transition-all duration-200 hover:shadow-[0_0_28px_2px_hsl(var(--primary)/0.16)] hover:border-primary/40 hover:-translate-y-0.5"
              style={{ animationDelay: `${480 + i * 70}ms` }}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <h4 className="font-semibold leading-tight">{p.title}</h4>
                <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusColors[p.status] ?? statusColors.Pending}`}>{p.status}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                <span className="font-medium text-foreground">{p.clients?.name ?? '—'}</span>
                <span>•</span>
                <span>{p.type}</span>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-3 min-h-[1rem]">
                <Typewriter text={p.description || 'No description.'} delay={600 + i * 70} speed={10} />
              </p>
            </button>
          ))}
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
