'use client'

import { useState, useTransition } from 'react'
import { batchEditProjects } from './actions'

type Client = { id: string; name: string }

export function BatchEditModal({
  ids, clients, types, onClose, onDone,
}: {
  ids: string[]
  clients: Client[]
  types: string[]
  onClose: () => void
  onDone: () => void
}) {
  const [mode, setMode] = useState<'empty' | 'override'>('empty')
  const [clientId, setClientId] = useState('')
  const [date, setDate] = useState('')
  const [type, setType] = useState('')
  const [link, setLink] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [err, setErr] = useState('')
  const [pending, start] = useTransition()

  const fields = {
    clientId: clientId || undefined,
    date: date || undefined,
    type: type || undefined,
    link: link.trim() || undefined,
  }
  const anything = Object.values(fields).some(Boolean)

  // In "empty" mode, client/type are never blank so they have no effect — surface that
  const effective: string[] = []
  if (fields.date) effective.push(mode === 'empty' ? 'Project date (only where blank)' : 'Project date')
  if (fields.link) effective.push(mode === 'empty' ? 'Download link (only where none exist)' : 'Download link (added)')
  if (mode === 'override' && fields.clientId) effective.push('Client')
  if (mode === 'override' && fields.type) effective.push('Project type')

  function apply() {
    setErr('')
    if (!anything) { setErr('Enter at least one value.'); return }
    if (effective.length === 0) { setErr('In "add on empty" mode, client/type are skipped (never blank). Pick date or link, or switch to Override.'); return }
    setConfirming(true)
  }
  function confirm() {
    start(async () => {
      const res = await batchEditProjects(ids, fields, mode)
      if (res?.error) { setErr(res.error); setConfirming(false) }
      else onDone()
    })
  }

  const clientName = clients.find(c => c.id === clientId)?.name

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="glass border border-border/50 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95">
        {!confirming ? (
          <>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">Batch Edit <span className="text-muted-foreground font-normal text-sm">({ids.length} selected)</span></h3>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>

            {/* Mode */}
            <div className="flex gap-1 bg-secondary/40 rounded-lg p-1 text-xs">
              {([['empty', 'Add on empty only'], ['override', 'Override']] as const).map(([m, label]) => (
                <button key={m} onClick={() => setMode(m)}
                  className={`flex-1 px-3 py-1.5 rounded-md font-medium transition-colors ${mode === m ? 'bg-background shadow-sm' : 'text-muted-foreground hover:bg-background/50'}`}>
                  {label}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">{mode === 'empty' ? 'Only fills fields that are currently blank. Client/type are never blank, so they’re skipped here.' : 'Overwrites the field on every selected project.'}</p>

            <label className="flex flex-col gap-1 text-sm">Client
              <select value={clientId} onChange={e => setClientId(e.target.value)} className="bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50">
                <option value="">— leave —</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">Project date
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50" />
            </label>
            <label className="flex flex-col gap-1 text-sm">Project type
              <select value={type} onChange={e => setType(e.target.value)} className="bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50">
                <option value="">— leave —</option>
                {types.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">Download link
              <input type="url" value={link} onChange={e => setLink(e.target.value)} placeholder="https://…" className="bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50" />
            </label>

            {err && <p className="text-xs text-red-500">{err}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={onClose} className="px-4 py-2 border border-border rounded-md text-sm font-medium hover:bg-muted/50 transition-colors">Cancel</button>
              <button onClick={apply} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:bg-primary/90 transition-colors">Review</button>
            </div>
          </>
        ) : (
          <>
            <h3 className="font-semibold text-lg">Confirm changes</h3>
            <p className="text-sm text-muted-foreground">Applying to <strong className="text-foreground">{ids.length}</strong> project{ids.length !== 1 ? 's' : ''} — mode: <strong className="text-foreground">{mode === 'empty' ? 'add on empty' : 'override'}</strong>.</p>
            <ul className="text-sm space-y-1 bg-secondary/20 rounded-lg p-3 border border-border/40">
              {fields.date && <li>Project date → <strong>{date}</strong>{mode === 'empty' && ' (blank only)'}</li>}
              {fields.link && <li>Download link added{mode === 'empty' && ' (where none exist)'}: <span className="text-primary break-all">{link}</span></li>}
              {mode === 'override' && clientName && <li>Client → <strong>{clientName}</strong></li>}
              {mode === 'override' && type && <li>Project type → <strong>{type}</strong></li>}
            </ul>
            {err && <p className="text-xs text-red-500">{err}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setConfirming(false)} disabled={pending} className="px-4 py-2 border border-border rounded-md text-sm font-medium hover:bg-muted/50 transition-colors">Cancel</button>
              <button onClick={confirm} disabled={pending} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50">{pending ? 'Applying…' : 'Confirm'}</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
