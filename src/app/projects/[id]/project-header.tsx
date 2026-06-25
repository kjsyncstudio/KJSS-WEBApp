'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import { updateProjectField } from './project-actions'
import { useUndo } from './undo-provider'

export function ProjectHeader({
  projectId, title: initialTitle, type: initialType, projectDate: initialDate, clientName, canManage, types,
}: {
  projectId: string
  title: string
  type: string
  projectDate: string | null
  clientName: string
  canManage: boolean
  types: string[]
}) {
  const [title, setTitle] = useState(initialTitle)
  const [type, setType] = useState(initialType)
  const [date, setDate] = useState(initialDate ?? '')
  // last persisted values (for undo)
  const [savedTitle, setSavedTitle] = useState(initialTitle)
  const [savedType, setSavedType] = useState(initialType)
  const [savedDate, setSavedDate] = useState(initialDate ?? '')

  const [editTitle, setEditTitle] = useState(false)
  const [editType, setEditType] = useState(false)
  const [editDate, setEditDate] = useState(false)
  const [, start] = useTransition()
  const undo = useUndo()

  const titleRef = useRef<HTMLInputElement>(null)
  useEffect(() => { if (editTitle) titleRef.current?.focus() }, [editTitle])

  function saveTitle() {
    setEditTitle(false)
    const v = title.trim()
    if (!v) { setTitle(savedTitle); return }
    if (v !== savedTitle) {
      const old = savedTitle
      undo?.push({ label: 'title', revert: () => { setTitle(old); setSavedTitle(old); updateProjectField(projectId, 'title', old) } })
      setSavedTitle(v); start(() => { updateProjectField(projectId, 'title', v) })
    }
  }
  function saveType(v: string) {
    setType(v); setEditType(false)
    if (v !== savedType) {
      const old = savedType
      undo?.push({ label: 'type', revert: () => { setType(old); setSavedType(old); updateProjectField(projectId, 'type', old) } })
      setSavedType(v); start(() => { updateProjectField(projectId, 'type', v) })
    }
  }
  function saveDate() {
    setEditDate(false)
    if (date !== savedDate) {
      const old = savedDate
      undo?.push({ label: 'date', revert: () => { setDate(old); setSavedDate(old); updateProjectField(projectId, 'project_date', old || null) } })
      setSavedDate(date); start(() => { updateProjectField(projectId, 'project_date', date || null) })
    }
  }

  const fmtDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })

  return (
    <div>
      {/* Title */}
      {editTitle ? (
        <input
          ref={titleRef}
          value={title}
          onChange={e => setTitle(e.target.value)}
          onBlur={saveTitle}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); saveTitle() } if (e.key === 'Escape') { setTitle(initialTitle); setEditTitle(false) } }}
          className="text-3xl font-bold tracking-tight mb-2 bg-transparent border-b border-primary/50 focus:outline-none w-full"
        />
      ) : (
        <h2 className={`text-3xl font-bold tracking-tight mb-2 ${canManage ? 'cursor-text hover:opacity-80' : ''}`}
          onDoubleClick={() => canManage && setEditTitle(true)}
          title={canManage ? 'Double-click to edit' : undefined}>
          {title}
        </h2>
      )}

      {/* Meta: client • type • date */}
      <div className="flex items-center gap-3 text-muted-foreground flex-wrap">
        <span className="font-medium text-foreground">{clientName}</span>
        <span>•</span>

        {/* Type */}
        {editType ? (
          <select
            autoFocus
            value={type}
            onChange={e => saveType(e.target.value)}
            onBlur={() => setEditType(false)}
            className="bg-secondary/50 border border-border rounded-md px-2 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
          >
            {types.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        ) : (
          <span className={canManage ? 'cursor-pointer hover:text-foreground' : ''}
            onDoubleClick={() => canManage && setEditType(true)}
            title={canManage ? 'Double-click to change type' : undefined}>
            {type}
          </span>
        )}

        <span>•</span>

        {/* Date */}
        {editDate ? (
          <input
            type="date"
            autoFocus
            value={date}
            onChange={e => setDate(e.target.value)}
            onBlur={saveDate}
            onKeyDown={e => { if (e.key === 'Enter') saveDate(); if (e.key === 'Escape') { setDate(initialDate ?? ''); setEditDate(false) } }}
            className="bg-secondary/50 border border-border rounded-md px-2 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        ) : (
          <span className={canManage ? 'cursor-pointer hover:text-foreground' : ''}
            onDoubleClick={() => canManage && setEditDate(true)}
            title={canManage ? 'Double-click to set date' : undefined}>
            {date ? fmtDate(date) : <span className="italic opacity-60">no date</span>}
          </span>
        )}
      </div>
    </div>
  )
}
