'use client'

import { useState, useRef, useEffect } from 'react'
import { saveDescription } from './project-actions'

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
  const [editing, setEditing] = useState(false)
  const taRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (editing) {
      const ta = taRef.current
      if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length) }
    }
  }, [editing])

  async function handleBlur() {
    setEditing(false)
    if (value !== initial) await saveDescription(projectId, value)
  }

  return (
    <div className="glass p-8 rounded-2xl border-border/50 mb-8">
      {value && <h3 className="text-lg font-semibold mb-2">Description</h3>}
      {editing ? (
        // ponytail: native textarea; Enter/Shift+Enter add newlines by default, blur saves
        <textarea
          ref={taRef}
          value={value}
          onChange={e => setValue(e.target.value)}
          onBlur={handleBlur}
          rows={4}
          className="w-full bg-transparent text-muted-foreground whitespace-pre-wrap resize-y focus:outline-none focus:ring-1 focus:ring-primary/50 rounded-md p-2 -m-2"
        />
      ) : (
        <p
          onDoubleClick={() => canManage && setEditing(true)}
          className={`text-muted-foreground whitespace-pre-wrap ${canManage ? 'cursor-text' : ''}`}
          title={canManage ? 'Double-click to edit' : undefined}
        >
          {value || 'insert description'}
        </p>
      )}
    </div>
  )
}
