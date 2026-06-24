'use client'

import { useState, useTransition } from 'react'
import { setClientPermission, removeClientPermission } from './permissions-actions'

type Member = { id: string; email: string; full_name: string | null; role: string }
type Client = { id: string; name: string }
type Perm = { user_id: string; client_id: string; can_read: boolean; can_write: boolean }

export function PermissionsPanel({ members, clients, permissions }: { members: Member[]; clients: Client[]; permissions: Perm[] }) {
  const [userId, setUserId] = useState('')
  const [clientId, setClientId] = useState('')
  const [canRead, setCanRead] = useState(true)
  const [canWrite, setCanWrite] = useState(false)
  const [err, setErr] = useState('')
  const [pending, start] = useTransition()

  // Only contractors/project managers are worth delegating to
  const delegatable = members.filter(m => m.role === 'project_manager' || m.role === 'guest')

  const nameOf = (id: string) => { const m = members.find(x => x.id === id); return m?.full_name || m?.email || id }
  const clientName = (id: string) => clients.find(c => c.id === id)?.name ?? id

  function grant() {
    setErr('')
    if (!userId || !clientId) { setErr('Pick a user and a client.'); return }
    start(async () => {
      const res = await setClientPermission(userId, clientId, canRead, canWrite)
      if (res?.error) setErr(res.error)
    })
  }

  function update(p: Perm, read: boolean, write: boolean) {
    start(async () => { await setClientPermission(p.user_id, p.client_id, read, write) })
  }

  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-xl font-semibold">Permissions</h3>
        <p className="text-muted-foreground text-sm">Grant a project manager read/write access to a specific client. They only see projects for clients granted here.</p>
      </div>

      {/* Grant form */}
      <div className="glass rounded-2xl border border-border/50 p-5 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          User
          <select value={userId} onChange={e => setUserId(e.target.value)}
            className="bg-background border border-border rounded-md px-3 py-2 text-sm min-w-[12rem] focus:outline-none focus:ring-1 focus:ring-primary/50">
            <option value="">Select user…</option>
            {delegatable.map(m => <option key={m.id} value={m.id}>{m.full_name || m.email}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Client
          <select value={clientId} onChange={e => setClientId(e.target.value)}
            className="bg-background border border-border rounded-md px-3 py-2 text-sm min-w-[12rem] focus:outline-none focus:ring-1 focus:ring-primary/50">
            <option value="">Select client…</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm py-2">
          <input type="checkbox" checked={canRead} onChange={e => setCanRead(e.target.checked)} /> Read
        </label>
        <label className="flex items-center gap-2 text-sm py-2">
          <input type="checkbox" checked={canWrite} onChange={e => setCanWrite(e.target.checked)} /> Write
        </label>
        <button onClick={grant} disabled={pending}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-semibold disabled:opacity-50">Grant</button>
      </div>
      {err && <p className="text-xs text-red-500">{err}</p>}

      {/* Existing grants */}
      <div className="glass rounded-2xl border border-border/50 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border/50 bg-muted/20">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">User</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Client</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Read</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Write</th>
              <th className="px-4 py-3 w-16" />
            </tr>
          </thead>
          <tbody>
            {permissions.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">No permissions granted yet.</td></tr>}
            {permissions.map(p => (
              <tr key={p.user_id + p.client_id} className="border-b border-border/30 last:border-0">
                <td className="px-4 py-3">{nameOf(p.user_id)}</td>
                <td className="px-4 py-3">{clientName(p.client_id)}</td>
                <td className="px-4 py-3"><input type="checkbox" checked={p.can_read} onChange={e => update(p, e.target.checked, p.can_write)} /></td>
                <td className="px-4 py-3"><input type="checkbox" checked={p.can_write} onChange={e => update(p, p.can_read, e.target.checked)} /></td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => start(async () => { await removeClientPermission(p.user_id, p.client_id) })}
                    className="text-xs text-destructive hover:underline">Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
