'use client'

import { useState, useEffect, useRef } from 'react'
import { saveTextPad } from './notes-actions'
import { useProjectLive } from './project-live'
import { useUndo } from './undo-provider'

export function TextPad({ projectId, initialContent, canManage }: { projectId: string, initialContent: string, canManage: boolean }) {
  const [content, setContent] = useState(initialContent)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState(initialContent)
  const editing = useRef(false)
  const ref = useRef<HTMLDivElement>(null)

  const live = useProjectLive()
  const undo = useUndo()
  const lockedBy = live?.lockedByOther('notes') ?? null

  // Set the editor HTML imperatively (uncontrolled, to keep the cursor stable)
  function applyHtml(html: string) { if (ref.current && ref.current.innerHTML !== html) ref.current.innerHTML = html }

  useEffect(() => { applyHtml(initialContent) }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  // Instant broadcast from others
  useEffect(() => {
    if (!live) return
    return live.onBroadcast('notes', p => {
      if (editing.current) return
      const html = (p.content as string) ?? ''
      applyHtml(html); setContent(html); setLastSaved(html)
    })
  }, [live])

  // Durable remote changes
  useEffect(() => {
    if (!live) return
    return live.onRemote('project_text_notes', row => {
      if (editing.current) return
      const html = (row.content as string) ?? ''
      applyHtml(html); setContent(html); setLastSaved(html)
    })
  }, [live])

  // Debounced autosave
  useEffect(() => {
    if (content === lastSaved || !canManage) return
    const timer = setTimeout(async () => {
      const old = lastSaved
      undo?.push({ label: 'notes', revert: () => { applyHtml(old); setContent(old); setLastSaved(old); saveTextPad(projectId, old) } })
      setIsSaving(true)
      await saveTextPad(projectId, content)
      setLastSaved(content)
      setIsSaving(false)
    }, 1000)
    return () => clearTimeout(timer)
  }, [content, projectId, lastSaved, canManage])

  function onInput() {
    const html = ref.current?.innerHTML ?? ''
    setContent(html)
    live?.broadcast('notes', { content: html })
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!(e.ctrlKey || e.metaKey)) return
    const k = e.key.toLowerCase()
    if (k === 'b' || k === 'i' || k === 'u') {
      e.preventDefault()
      document.execCommand(k === 'b' ? 'bold' : k === 'i' ? 'italic' : 'underline')
      onInput()
    }
  }

  return (
    <div className="glass rounded-2xl border-border/50 flex flex-col overflow-hidden mb-8">
      <div className="bg-secondary/50 px-4 py-3 border-b border-border/50 flex justify-between items-center">
        <h3 className="font-semibold text-sm">Project Notes <span className="font-normal text-muted-foreground text-xs ml-1">Ctrl+B / I / U</span></h3>
        <span className="text-xs text-muted-foreground">
          {lockedBy ? `${lockedBy} is editing…` : isSaving ? 'Saving...' : 'All changes saved'}
        </span>
      </div>
      {canManage && !lockedBy ? (
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          onInput={onInput}
          onKeyDown={onKeyDown}
          onFocus={() => { editing.current = true; live?.lock('notes') }}
          onBlur={() => { editing.current = false; live?.unlock('notes') }}
          data-placeholder="Start typing your notes here..."
          className="notepad w-full bg-transparent p-4 min-h-[150px] focus:outline-none focus:bg-secondary/10 transition-colors text-sm"
        />
      ) : (
        <div className="notepad w-full p-4 min-h-[150px] text-sm opacity-80" dangerouslySetInnerHTML={{ __html: content || '<span class="text-muted-foreground">No notes.</span>' }} />
      )}
      <style>{`
        .notepad b, .notepad strong { font-weight: 700; }
        .notepad i, .notepad em { font-style: italic; }
        .notepad u { text-decoration: underline; }
        .notepad[contenteditable]:empty:before { content: attr(data-placeholder); color: hsl(var(--muted-foreground)); }
      `}</style>
    </div>
  )
}
