'use client'

import { useState, useEffect } from 'react'
import { saveTextPad } from './notes-actions'

export function TextPad({ projectId, initialContent, canManage }: { projectId: string, initialContent: string, canManage: boolean }) {
  const [content, setContent] = useState(initialContent)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSavedContent, setLastSavedContent] = useState(initialContent)

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
          {isSaving ? 'Saving...' : 'All changes saved locally'}
        </span>
      </div>
      <textarea
        className="w-full bg-transparent p-4 min-h-[150px] resize-y focus:outline-none focus:bg-secondary/10 transition-colors text-sm"
        placeholder="Start typing your notes here..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        disabled={!canManage}
      />
    </div>
  )
}
