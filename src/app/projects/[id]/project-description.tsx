'use client'

import { useState, useRef, useEffect } from 'react'
import { saveDescription } from './project-actions'
import { useProjectLive } from './project-live'
import { useUndo } from './undo-provider'

export function ProjectDescription({
  projectId,
  initial,
  canManage,
}: {
  projectId: string
  initial: string
  canManage: boolean
}) {
  const [value, setValue] = useState(initial)
  const [saved, setSaved] = useState(initial)
  const [editing, setEditing] = useState(false)
  const taRef = useRef<HTMLTextAreaElement>(null)

  const live = useProjectLive()
  const undo = useUndo()
  const lockedBy = live?.lockedByOther('description') ?? null

  useEffect(() => {
    if (editing) {
      const ta = taRef.current
      if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length) }
    }
  }, [editing])

  // Instant: apply broadcast keystrokes
  useEffect(() => {
    if (!live) return
    return live.onBroadcast('description', p => {
      if (editing) return
      setValue((p.value as string) ?? '')
    })
  }, [live, editing])

  // Durable: apply persisted remote description changes
  useEffect(() => {
    if (!live) return
    return live.onRemote('projects', row => {
      if (editing) return
      const next = (row.description as string) ?? ''
      setValue(next); setSaved(next)
    })
  }, [live, editing])

  async function handleBlur() {
    setEditing(false)
    live?.unlock('description')
    if (value !== saved) {
      const old = saved
      undo?.push({ label: 'description', revert: () => { setValue(old); setSaved(old); saveDescription(projectId, old) } })
      await saveDescription(projectId, value); setSaved(value)
    }
  }

  return (
    <div className="glass p-8 rounded-2xl border-border/50 mb-8">
      <div className="flex items-center justify-between mb-2">
        {value ? <h3 className="text-lg font-semibold">Description</h3> : <span />}
        {lockedBy && <span className="text-xs text-muted-foreground">{lockedBy} is editing…</span>}
      </div>
      {editing ? (
        // ponytail: native textarea; Enter/Shift+Enter add newlines by default, blur saves
        <textarea
          ref={taRef}
          value={value}
          onChange={e => { setValue(e.target.value); live?.broadcast('description', { value: e.target.value }) }}
          onBlur={handleBlur}
          rows={4}
          className="w-full bg-transparent text-muted-foreground whitespace-pre-wrap resize-y focus:outline-none focus:ring-1 focus:ring-primary/50 rounded-md p-2 -m-2"
        />
      ) : (
        <p
          onDoubleClick={() => { if (canManage && !lockedBy) { live?.lock('description'); setEditing(true) } }}
          className={`text-muted-foreground whitespace-pre-wrap ${canManage && !lockedBy ? 'cursor-text' : ''}`}
          title={canManage ? (lockedBy ? `${lockedBy} is editing` : 'Double-click to edit') : undefined}
        >
          {value || 'insert description'}
        </p>
      )}
    </div>
  )
}
