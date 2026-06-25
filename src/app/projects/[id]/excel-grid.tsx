'use client'

import { useState, useEffect, useRef } from 'react'
import { saveGridCell, updateGridColumn } from './notes-actions'
import { useProjectLive } from './project-live'

type GridColumn = { col_index: number; header: string }
type GridCell = { row_index: number; col_index: number; value: string }

export function ExcelGrid({ projectId, initialColumns, initialCells, canManage }: {
  projectId: string
  initialColumns: GridColumn[]
  initialCells: GridCell[]
  canManage: boolean
}) {
  const [columns, setColumns] = useState<GridColumn[]>(() =>
    initialColumns.length > 0 ? initialColumns : [{ col_index: 0, header: 'Column A' }, { col_index: 1, header: 'Column B' }])

  const maxRowIndex = initialCells.length > 0 ? Math.max(...initialCells.map(c => c.row_index)) : 0
  const [rowCount, setRowCount] = useState(maxRowIndex + 1)
  const [cells, setCells] = useState<GridCell[]>(initialCells)
  const [savingCells, setSavingCells] = useState<Record<string, boolean>>({})
  const [editingKey, setEditingKey] = useState<string | null>(null)

  // Excel-like selection / edit state
  const [sel, setSel] = useState<{ r: number; c: number } | null>(null)
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const wrapRef = useRef<HTMLDivElement>(null)
  const editRef = useRef<HTMLTextAreaElement>(null)

  const live = useProjectLive()
  const colCount = columns.length
  const cellVal = (r: number, c: number) => cells.find(x => x.row_index === r && x.col_index === c)?.value ?? ''

  // focus textarea when entering edit mode
  useEffect(() => {
    if (editing) { const t = editRef.current; if (t) { t.focus(); t.setSelectionRange(t.value.length, t.value.length) } }
  }, [editing])
  // keep the grid focused for keyboard nav when a cell is selected but not editing
  useEffect(() => { if (sel && !editing) wrapRef.current?.focus() }, [sel, editing])

  // Instant: broadcast keystrokes from others
  useEffect(() => {
    if (!live) return
    const offCell = live.onBroadcast('cell', p => {
      const r = p.r as number, c = p.c as number
      if (editingKey === `${r}-${c}`) return
      setRowCount(prev => Math.max(prev, r + 1))
      setCells(prev => {
        const i = prev.findIndex(x => x.row_index === r && x.col_index === c)
        const next = [...prev]; const val = (p.value as string) ?? ''
        if (i >= 0) next[i] = { row_index: r, col_index: c, value: val }; else next.push({ row_index: r, col_index: c, value: val })
        return next
      })
    })
    const offCol = live.onBroadcast('col', p => {
      const c = p.c as number
      setColumns(prev => { const i = prev.findIndex(x => x.col_index === c); const next = [...prev]
        if (i >= 0) next[i] = { col_index: c, header: (p.header as string) ?? '' }; else next.push({ col_index: c, header: (p.header as string) ?? '' }); return next })
    })
    return () => { offCell(); offCol() }
  }, [live, editingKey])

  // Durable: persisted remote changes
  useEffect(() => {
    if (!live) return
    const offCell = live.onRemote('project_grid_cells', row => {
      const r = row.row_index as number, c = row.col_index as number
      if (editingKey === `${r}-${c}`) return
      setRowCount(prev => Math.max(prev, r + 1))
      setCells(prev => { const i = prev.findIndex(x => x.row_index === r && x.col_index === c); const next = [...prev]
        if (i >= 0) next[i] = { row_index: r, col_index: c, value: (row.value as string) ?? '' }; else next.push({ row_index: r, col_index: c, value: (row.value as string) ?? '' }); return next })
    })
    const offCol = live.onRemote('project_grid_columns', row => {
      const c = row.col_index as number
      setColumns(prev => { const i = prev.findIndex(x => x.col_index === c); const next = [...prev]
        if (i >= 0) next[i] = { col_index: c, header: (row.header as string) ?? '' }; else next.push({ col_index: c, header: (row.header as string) ?? '' }); return next })
    })
    return () => { offCell(); offCol() }
  }, [live, editingKey])

  function handleAddRow() { setRowCount(prev => prev + 1) }
  function handleAddColumn() {
    if (columns.length >= 5) return
    const newColIndex = columns.length
    const newColumn = { col_index: newColIndex, header: `Column ${String.fromCharCode(65 + newColIndex)}` }
    setColumns([...columns, newColumn])
    if (canManage) updateGridColumn(projectId, newColumn.col_index, newColumn.header)
  }

  async function saveCell(r: number, c: number, value: string) {
    setCells(prev => { const i = prev.findIndex(x => x.row_index === r && x.col_index === c); const next = [...prev]
      if (i >= 0) next[i] = { row_index: r, col_index: c, value }; else next.push({ row_index: r, col_index: c, value }); return next })
    live?.broadcast('cell', { r, c, value })
    if (!canManage) return
    const key = `${r}-${c}`
    setSavingCells(prev => ({ ...prev, [key]: true }))
    await saveGridCell(projectId, r, c, value)
    setSavingCells(prev => ({ ...prev, [key]: false }))
  }

  async function handleHeaderChange(colIndex: number, header: string) {
    setColumns(prev => prev.map(c => c.col_index === colIndex ? { ...c, header } : c))
    live?.broadcast('col', { c: colIndex, header })
    if (canManage) await updateGridColumn(projectId, colIndex, header)
  }

  // --- editing helpers ---
  function startEdit(r: number, c: number, initial?: string) {
    if (!canManage) return
    if (live?.lockedByOther(`cell-${r}-${c}`)) return
    setSel({ r, c }); setEditValue(initial ?? cellVal(r, c)); setEditing(true)
    setEditingKey(`${r}-${c}`); live?.lock(`cell-${r}-${c}`)
  }
  function endEdit() {
    if (sel) live?.unlock(`cell-${sel.r}-${sel.c}`)
    setEditingKey(null); setEditing(false)
  }
  function select(r: number, c: number) { setSel({ r, c }); setEditing(false) }

  // keyboard nav while NOT editing
  function onGridKey(e: React.KeyboardEvent) {
    if (!sel || editing || !canManage) return
    const { r, c } = sel
    const k = e.key
    if (k === 'ArrowUp') { e.preventDefault(); select(Math.max(0, r - 1), c) }
    else if (k === 'ArrowDown') { e.preventDefault(); select(Math.min(rowCount - 1, r + 1), c) }
    else if (k === 'ArrowLeft') { e.preventDefault(); select(r, Math.max(0, c - 1)) }
    else if (k === 'ArrowRight') { e.preventDefault(); select(r, Math.min(colCount - 1, c + 1)) }
    else if (k === 'Enter') {
      e.preventDefault()
      if (e.shiftKey) { if (r + 1 >= rowCount) setRowCount(r + 2); select(r + 1, c) }  // new row below + select it
      else startEdit(r, c)
    }
    else if (k === 'Tab') { e.preventDefault(); select(r, e.shiftKey ? Math.max(0, c - 1) : Math.min(colCount - 1, c + 1)) }
    else if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); saveCell(r, c, '') }
    else if (k.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); startEdit(r, c, k) }  // type to edit
  }

  // keyboard while editing
  function onEditKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter') {
      if (e.shiftKey || e.ctrlKey) {
        // newline inside the cell
        e.preventDefault()
        const t = editRef.current!; const s = t.selectionStart, en = t.selectionEnd
        const nv = editValue.slice(0, s) + '\n' + editValue.slice(en)
        setEditValue(nv)
        requestAnimationFrame(() => { t.setSelectionRange(s + 1, s + 1) })
      } else {
        // confirm + move down
        e.preventDefault()
        if (sel) { saveCell(sel.r, sel.c, editValue); const nr = sel.r + 1; if (nr >= rowCount) setRowCount(nr + 1); endEdit(); select(nr, sel.c) }
      }
    } else if (e.key === 'Escape') { e.preventDefault(); endEdit() }
    else if (e.key === 'Tab') {
      e.preventDefault()
      if (sel) { saveCell(sel.r, sel.c, editValue); endEdit(); select(sel.r, Math.min(colCount - 1, sel.c + 1)) }
    }
  }

  return (
    <div className="glass rounded-2xl border-border/50 flex flex-col overflow-hidden mb-8">
      <div className="bg-secondary/50 px-4 py-3 border-b border-border/50 flex justify-between items-center">
        <h3 className="font-semibold text-sm">Project Sheet</h3>
        {canManage && (
          <div className="flex gap-2">
            <button onClick={handleAddColumn} disabled={columns.length >= 5}
              className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-md font-medium hover:bg-primary/20 transition-colors disabled:opacity-50">+ Add Column</button>
            <button onClick={handleAddRow}
              className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-md font-medium hover:bg-primary/20 transition-colors">+ Add Row</button>
          </div>
        )}
      </div>

      <div ref={wrapRef} tabIndex={0} onKeyDown={onGridKey} className="overflow-x-auto focus:outline-none">
        <table className="w-full text-sm text-left border-collapse">
          <thead className="text-xs uppercase bg-secondary/20">
            <tr>
              <th className="w-12 border-b border-r border-border/50 text-center py-2 text-muted-foreground bg-secondary/40">#</th>
              {columns.map(col => (
                <th key={col.col_index} className="border-b border-r border-border/50 relative group min-w-[150px]">
                  <input type="text" value={col.header} onChange={e => handleHeaderChange(col.col_index, e.target.value)} disabled={!canManage}
                    className="w-full bg-transparent px-4 py-2 font-semibold focus:outline-none focus:bg-secondary/20 text-foreground" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rowCount }).map((_, rIdx) => (
              <tr key={rIdx} className="border-b border-border/50">
                <td className="border-r border-border/50 text-center text-muted-foreground bg-secondary/10 w-12 font-medium">{rIdx + 1}</td>
                {columns.map(col => {
                  const c = col.col_index
                  const key = `${rIdx}-${c}`
                  const selected = sel?.r === rIdx && sel?.c === c
                  const isEditing = editing && selected
                  const isSaving = savingCells[key]
                  const lockedBy = live?.lockedByOther(`cell-${key}`) ?? null
                  return (
                    <td key={c}
                      onClick={() => canManage && !lockedBy && select(rIdx, c)}
                      onDoubleClick={() => startEdit(rIdx, c)}
                      title={lockedBy ? `${lockedBy} is editing` : undefined}
                      className={`border-r border-border/50 p-0 relative ${selected && !isEditing ? 'ring-2 ring-primary ring-inset' : ''} ${lockedBy ? 'bg-amber-500/10' : ''} ${canManage && !lockedBy ? 'cursor-cell' : ''}`}>
                      {isEditing ? (
                        <textarea ref={editRef} value={editValue} rows={1}
                          onChange={e => setEditValue(e.target.value)}
                          onKeyDown={onEditKey}
                          onBlur={() => { if (sel) { saveCell(sel.r, sel.c, editValue); endEdit() } }}
                          className="w-full bg-background px-4 py-2 resize-none focus:outline-none ring-2 ring-primary ring-inset min-h-[2.4rem] align-top" />
                      ) : (
                        <div className={`px-4 py-2 whitespace-pre-wrap min-h-[2.4rem] ${isSaving ? 'opacity-50' : ''}`}>
                          {cellVal(rIdx, c) || <span className="text-muted-foreground/30">{lockedBy ? '🔒' : ''}</span>}
                        </div>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {canManage && (
        <p className="text-[11px] text-muted-foreground px-4 py-2 border-t border-border/50">
          Click a cell, then arrow keys to move · type or Enter to edit · Shift/Ctrl+Enter = new line in cell · Enter confirms · Shift+Enter (not editing) adds a row.
        </p>
      )}
    </div>
  )
}
