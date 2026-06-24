'use client'

import { useState, useTransition } from 'react'
import { restoreProject, hardDeleteProject } from './settings-actions'

type Deleted = { id: string; title: string; deleted_at: string; clients?: { name: string } }

export function DeletedBin({ projects }: { projects: Deleted[] }) {
  const [pending, start] = useTransition()
  const [busy, setBusy] = useState<string | null>(null)

  function run(id: string, fn: () => Promise<unknown>) {
    setBusy(id)
    start(async () => { await fn(); setBusy(null) })
  }

  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-xl font-semibold">Deleted Projects</h3>
        <p className="text-muted-foreground text-sm">Soft-deleted projects. Restore, or permanently remove (cannot be undone).</p>
      </div>
      <div className="glass rounded-2xl border border-border/50 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border/50 bg-muted/20">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Project</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Client</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Deleted</th>
              <th className="px-4 py-3 w-40" />
            </tr>
          </thead>
          <tbody>
            {projects.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">Bin is empty.</td></tr>
            )}
            {projects.map((p, i) => (
              <tr key={p.id} className={`border-b border-border/30 last:border-0 ${i % 2 === 0 ? '' : 'bg-muted/5'}`}>
                <td className="px-4 py-3 font-medium">{p.title}</td>
                <td className="px-4 py-3 text-muted-foreground">{p.clients?.name ?? '—'}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{new Date(p.deleted_at).toLocaleString()}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <button onClick={() => run(p.id, () => restoreProject(p.id))} disabled={pending && busy === p.id}
                    className="text-xs text-primary hover:underline disabled:opacity-50 mr-3">Restore</button>
                  <button onClick={() => { if (confirm(`Permanently delete "${p.title}"? This cannot be undone.`)) run(p.id, () => hardDeleteProject(p.id)) }}
                    disabled={pending && busy === p.id}
                    className="text-xs text-destructive hover:underline disabled:opacity-50">Delete forever</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
