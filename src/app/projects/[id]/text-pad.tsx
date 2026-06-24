'use client'

import { useState, useEffect, useRef } from 'react'
import { saveTextPad } from './notes-actions'
import { useProjectLive } from './project-live'

export function TextPad({ projectId, initialContent, canManage }: { projectId: string, initialContent: string, canManage: boolean }) {
  const [content, setContent] = useState(initialContent)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSavedContent, setLastSavedContent] = useState(initialContent)
  const editing = useRef(false)

  const live = useProjectLive()
  const lockedBy = live?.lockedByOther('notes') ?? null

  // Instant: apply broadcast keystrokes from others
  useEffect(() => {
    if (!live) return
    return live.onBroadcast('notes', p => {
      if (editing.current) return
      setContent((p.content as string) ?? '')
    })
  }, [live])

  // Durable: apply persisted remote note changes (late joiners / after refresh)
  useEffect(() => {
    if (!live) return
    return live.onRemote('project_text_notes', row => {
      if (editing.current) return
      const next = (row.content as string) ?? ''
      setContent(next); setLastSavedContent(next)
    })
  }, [live])

  // Auto-save logic (simple debounce)
  useEffect(() => {
    if (content === lastSavedContent || !canManage) return

    const timer = setTimeout(async () => {
      setIsSaving(true)
      await saveTextPad(projectId, content)
      setLastSavedContent(content)
      setIsSaving(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [content, projectId, lastSavedContent, canManage])

  return (
    <div className="glass rounded-2xl border-border/50 flex flex-col overflow-hidden mb-8">
      <div className="bg-secondary/50 px-4 py-3 border-b border-border/50 flex justify-between items-center">
        <h3 className="font-semibold text-sm">Project Notes</h3>
        <span className="text-xs text-muted-foreground">
          {lockedBy ? `${lockedBy} is editing…` : isSaving ? 'Saving...' : 'All changes saved'}
        </span>
      </div>
      <textarea
        className="w-full bg-transparent p-4 min-h-[150px] resize-y focus:outline-none focus:bg-secondary/10 transition-colors text-sm disabled:opacity-60"
        placeholder="Start typing your notes here..."
        value={content}
        onChange={(e) => { setContent(e.target.value); live?.broadcast('notes', { content: e.target.value }) }}
        onFocus={() => { editing.current = true; live?.lock('notes') }}
        onBlur={() => { editing.current = false; live?.unlock('notes') }}
        disabled={!canManage || !!lockedBy}
      />
    </div>
  )
}
