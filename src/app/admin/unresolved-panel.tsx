'use client'

import { useState, useTransition } from 'react'
import { resolveProject } from './settings-actions'

type Unresolved = { id: string; title: string; status: string | null; client_id: string | null; clients?: { name: string } | null }
type Client = { id: string; name: string }

function Row({ p, clients, statuses }: { p: Unresolved; clients: Client[]; statuses: string[] }) {
  const [clientId, setClientId] = useState(p.client_id ?? '')
  const [status, setStatus] = useState(statuses.includes(p.status ?? '') ? (p.status as string) : '')
  const [err, setErr] = useState('')
  const [done, setDone] = useState(false)
  const [pending, start] = useTransition()

  function save() {
    setErr('')
    start(async () => {
      const res = await resolveProject(p.id, clientId, status)
      if (res?.error) setErr(res.error); else setDone(true)
    })
  }

  if (done) return null

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 text-sm">
      <span className="font-medium flex-1 min-w-[8rem] truncate">{p.title}</span>
      <select value={clientId} onChange={e => setClientId(e.target.value)}
        className={`bg-background border rounded-md px-2 py-1 text-xs focus:outline-none ${clientId ? 'border-border' : 'border-red-500/50'}`}>
        <option value="">Client…</option>
        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <select value={status} onChange={e => setStatus(e.target.value)}
        className={`bg-background border rounded-md px-2 py-1 text-xs focus:outline-none ${status ? 'border-border' : 'border-red-500/50'}`}>
        <option value="">Status…</option>
        {statuses.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
      <button onClick={save} disabled={pending || !clientId || !status}
        className="text-xs bg-primary text-primary-foreground px-3 py-1 rounded-md font-medium disabled:opacity-50">Resolve</button>
      {err && <span className="text-xs text-red-500 w-full">{err}</span>}
    </div>
  )
}

export function UnresolvedPanel({ projects, clients, statuses }: { projects: Unresolved[]; clients: Client[]; statuses: string[] }) {
  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-xl font-semibold">Unresolved Projects</h3>
        <p className="text-muted-foreground text-sm">Projects missing a client or a valid status. Set both, then Resolve.</p>
      </div>
      <div className="glass rounded-2xl border border-border/50 divide-y divide-border/30">
        {projects.length === 0
          ? <p className="px-4 py-6 text-center text-sm text-muted-foreground">Nothing to resolve — all projects are complete.</p>
          : projects.map(p => <Row key={p.id} p={p} clients={clients} statuses={statuses} />)}
      </div>
    </section>
  )
}
