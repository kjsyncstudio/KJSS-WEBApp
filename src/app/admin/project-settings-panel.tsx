'use client'

import { useState, useTransition } from 'react'
import { addSetting, renameSetting, deleteSetting } from './settings-actions'

type Kind = 'status' | 'type'

function SettingColumn({ kind, label, values }: { kind: Kind; label: string; values: string[] }) {
  const [adding, setAdding] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [err, setErr] = useState('')
  const [pending, start] = useTransition()

  function run(fn: () => Promise<{ error?: string }>) {
    setErr('')
    start(async () => {
      const res = await fn()
      if (res?.error) setErr(res.error)
    })
  }

  return (
    <div className="glass rounded-2xl border border-border/50 p-5 space-y-3">
      <h4 className="font-semibold text-sm">{label}</h4>

      <div className="flex flex-col gap-1.5">
        {values.map(v => (
          <div key={v} className="flex items-center gap-2 bg-secondary/20 rounded-md px-3 py-1.5 group">
            {editing === v ? (
              <>
                <input autoFocus value={editValue} onChange={e => setEditValue(e.target.value)}
                  className="flex-1 bg-background border border-border rounded px-2 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50" />
                <button onClick={() => { run(() => renameSetting(kind, v, editValue)); setEditing(null) }}
                  className="text-xs text-primary font-medium">Save</button>
                <button onClick={() => setEditing(null)} className="text-xs text-muted-foreground">Cancel</button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm">{v}</span>
                <button onClick={() => { setEditing(v); setEditValue(v) }}
                  className="text-xs text-muted-foreground hover:text-foreground">Edit</button>
                <button onClick={() => run(() => deleteSetting(kind, v))} disabled={pending}
                  className="text-xs text-destructive hover:underline">Delete</button>
              </>
            )}
          </div>
        ))}
      </div>

      <form onSubmit={e => { e.preventDefault(); if (adding.trim()) { run(() => addSetting(kind, adding)); setAdding('') } }}
        className="flex gap-2">
        <input value={adding} onChange={e => setAdding(e.target.value)} placeholder={`Add ${label.toLowerCase().replace(/s$/, '')}…`}
          className="flex-1 bg-background border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50" />
        <button type="submit" disabled={pending || !adding.trim()}
          className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-md font-medium disabled:opacity-50">Add</button>
      </form>

      {err && <p className="text-xs text-red-500">{err}</p>}
    </div>
  )
}

export function ProjectSettingsPanel({ statuses, types }: { statuses: string[]; types: string[] }) {
  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-xl font-semibold">Project Settings</h3>
        <p className="text-muted-foreground text-sm">Manage available project statuses and types. Renaming updates existing projects.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <SettingColumn kind="status" label="Statuses" values={statuses} />
        <SettingColumn kind="type" label="Types" values={types} />
      </div>
    </section>
  )
}
