'use client'

import { useState, useEffect, useRef } from 'react'
import { saveGridCell, updateGridColumn, deleteGridRow } from './notes-actions'
import { useProjectLive } from './project-live'
import { useUndo } from './undo-provider'

type GridColumn = { col_index: number; header: string }
type GridCell = { row_index: number; col_index: number; value: string }
type Pt = { r: number; c: number }

// TSV-escape a cell value so Excel/Sheets parse embedded tabs/newlines correctly
function tsvEscape(v: string) {
  return /[\t\n"]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v
}

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

  const [sel, setSel] = useState<Pt | null>(null)       // active / anchor cell
  const [rangeEnd, setRangeEnd] = useState<Pt | null>(null) // focus cell of a multi-select
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const wrapRef = useRef<HTMLDivElement>(null)
  const editRef = useRef<HTMLTextAreaElement>(null)
  const dragging = useRef(false)
  const editOld = useRef('')

  const live = useProjectLive()
  const undo = useUndo()
  const colCount = columns.length
  const cellVal = (r: number, c: number) => cells.find(x => x.row_index === r && x.col_index === c)?.value ?? ''

  const rect = () => {
    if (!sel) return null
    const e = rangeEnd ?? sel
    return { r0: Math.min(sel.r, e.r), r1: Math.max(sel.r, e.r), c0: Math.min(sel.c, e.c), c1: Math.max(sel.c, e.c) }
  }
  const inSel = (r: number, c: number) => { const x = rect(); return !!x && r >= x.r0 && r <= x.r1 && c >= x.c0 && c <= x.c1 }

  useEffect(() => { if (editing) { const t = editRef.current; if (t) { t.focus(); t.setSelectionRange(t.value.length, t.value.length) } } }, [editing])
  useEffect(() => { if (sel && !editing) wrapRef.current?.focus() }, [sel, editing])
  useEffect(() => {
    const up = () => { dragging.current = false }
    window.addEventListener('mouseup', up)
    return () => window.removeEventListener('mouseup', up)
  }, [])

  // realtime
  useEffect(() => {
    if (!live) return
    const offCell = live.onBroadcast('cell', p => {
      const r = p.r as number, c = p.c as number
      if (editingKey === `${r}-${c}`) return
      setRowCount(prev => Math.max(prev, r + 1))
      setCells(prev => { const i = prev.findIndex(x => x.row_index === r && x.col_index === c); const next = [...prev]; const val = (p.value as string) ?? ''
        if (i >= 0) next[i] = { row_index: r, col_index: c, value: val }; else next.push({ row_index: r, col_index: c, value: val }); return next })
    })
    const offCol = live.onBroadcast('col', p => {
      const c = p.c as number
      setColumns(prev => { const i = prev.findIndex(x => x.col_index === c); const next = [...prev]
        if (i >= 0) next[i] = { col_index: c, header: (p.header as string) ?? '' }; else next.push({ col_index: c, header: (p.header as string) ?? '' }); return next })
    })
    return () => { offCell(); offCol() }
  }, [live, editingKey])

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

  // change a cell + record undo of its previous value
  function commitCell(r: number, c: number, value: string) {
    const old = cellVal(r, c)
    if (value === old) return
    undo?.push({ label: 'cell', revert: () => saveCell(r, c, old) })
    saveCell(r, c, value)
  }

  async function handleHeaderChange(colIndex: number, header: string) {
    setColumns(prev => prev.map(c => c.col_index === colIndex ? { ...c, header } : c))
    live?.broadcast('col', { c: colIndex, header })
    if (canManage) await updateGridColumn(projectId, colIndex, header)
  }

  async function deleteRow(r: number) {
    if (!canManage || rowCount <= 1) return
    if (!confirm('Delete this row?')) return
    setCells(prev => prev.filter(c => c.row_index !== r).map(c => c.row_index > r ? { ...c, row_index: c.row_index - 1 } : c))
    setRowCount(n => Math.max(1, n - 1))
    setSel(null); setRangeEnd(null)
    await deleteGridRow(projectId, r)  // ponytail: row delete is explicit (confirm) — not on the undo stack
  }

  function copySelection() {
    const x = rect(); if (!x) return
    const lines: string[] = []
    for (let r = x.r0; r <= x.r1; r++) {
      const row: string[] = []
      for (let c = x.c0; c <= x.c1; c++) row.push(tsvEscape(cellVal(r, c)))
      lines.push(row.join('\t'))
    }
    navigator.clipboard?.writeText(lines.join('\n'))
  }

  function clearSelection() {
    const x = rect(); if (!x) return
    const olds: { r: number; c: number; v: string }[] = []
    for (let r = x.r0; r <= x.r1; r++) for (let c = x.c0; c <= x.c1; c++) { const v = cellVal(r, c); if (v) olds.push({ r, c, v }) }
    if (olds.length === 0) return
    undo?.push({ label: 'clear', revert: () => olds.forEach(o => saveCell(o.r, o.c, o.v)) })
    for (let r = x.r0; r <= x.r1; r++) for (let c = x.c0; c <= x.c1; c++) saveCell(r, c, '')
  }

  function startEdit(r: number, c: number, initial?: string) {
    if (!canManage || live?.lockedByOther(`cell-${r}-${c}`)) return
    setSel({ r, c }); setRangeEnd(null); editOld.current = cellVal(r, c); setEditValue(initial ?? cellVal(r, c)); setEditing(true)
    setEditingKey(`${r}-${c}`); live?.lock(`cell-${r}-${c}`)
  }
  function endEdit() { if (sel) live?.unlock(`cell-${sel.r}-${sel.c}`); setEditingKey(null); setEditing(false) }
  function commitEdit() { if (sel && editValue !== editOld.current) { undo?.push({ label: 'cell', revert: () => saveCell(sel.r, sel.c, editOld.current) }); saveCell(sel.r, sel.c, editValue) } }
  function select(r: number, c: number) { setSel({ r, c }); setRangeEnd(null); setEditing(false) }

  function onCellMouseDown(e: React.MouseEvent, r: number, c: number) {
    if (!canManage || editing) return
    e.preventDefault()
    if (e.shiftKey && sel) { setRangeEnd({ r, c }); return }
    setSel({ r, c }); setRangeEnd(null); dragging.current = true
  }
  function onCellEnter(r: number, c: number) { if (dragging.current) setRangeEnd({ r, c }) }

  function onGridKey(e: React.KeyboardEvent) {
    if (!sel || editing || !canManage) return
    const { r, c } = sel
    const k = e.key
    if ((e.ctrlKey || e.metaKey) && k.toLowerCase() === 'c') { e.preventDefault(); copySelection(); return }
    const end = rangeEnd ?? sel
    if (k === 'ArrowUp') { e.preventDefault(); e.shiftKey ? setRangeEnd({ r: Math.max(0, end.r - 1), c: end.c }) : select(Math.max(0, r - 1), c) }
    else if (k === 'ArrowDown') { e.preventDefault(); e.shiftKey ? setRangeEnd({ r: Math.min(rowCount - 1, end.r + 1), c: end.c }) : select(Math.min(rowCount - 1, r + 1), c) }
    else if (k === 'ArrowLeft') { e.preventDefault(); e.shiftKey ? setRangeEnd({ r: end.r, c: Math.max(0, end.c - 1) }) : select(r, Math.max(0, c - 1)) }
    else if (k === 'ArrowRight') { e.preventDefault(); e.shiftKey ? setRangeEnd({ r: end.r, c: Math.min(colCount - 1, end.c + 1) }) : select(r, Math.min(colCount - 1, c + 1)) }
    else if (k === 'Enter') { e.preventDefault(); if (e.shiftKey) { if (r + 1 >= rowCount) setRowCount(r + 2); select(r + 1, c) } else startEdit(r, c) }
    else if (k === 'Tab') { e.preventDefault(); select(r, e.shiftKey ? Math.max(0, c - 1) : Math.min(colCount - 1, c + 1)) }
    else if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); clearSelection() }
    else if (k.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); startEdit(r, c, k) }
  }

  function onEditKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter') {
      if (e.shiftKey || e.ctrlKey) {
        e.preventDefault()
        const t = editRef.current!; const s = t.selectionStart, en = t.selectionEnd
        const nv = editValue.slice(0, s) + '\n' + editValue.slice(en)
        setEditValue(nv); requestAnimationFrame(() => { t.setSelectionRange(s + 1, s + 1) })
      } else { e.preventDefault(); commitEdit(); const nr = (sel?.r ?? 0) + 1; if (nr >= rowCount) setRowCount(nr + 1); const cc = sel?.c ?? 0; endEdit(); select(nr, cc) }
    } else if (e.key === 'Escape') { e.preventDefault(); endEdit() }
    else if (e.key === 'Tab') { e.preventDefault(); commitEdit(); const cc = Math.min(colCount - 1, (sel?.c ?? 0) + 1); const rr = sel?.r ?? 0; endEdit(); select(rr, cc) }
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

      <div ref={wrapRef} tabIndex={0} onKeyDown={onGridKey} className="overflow-x-auto focus:outline-none select-none">
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
              <tr key={rIdx} className="border-b border-border/50 group/row">
                <td className="border-r border-border/50 text-center text-muted-foreground bg-secondary/10 w-12 font-medium relative">
                  <span className="group-hover/row:opacity-0 transition-opacity">{rIdx + 1}</span>
                  {canManage && (
                    <button onClick={() => deleteRow(rIdx)} title="Delete row"
                      className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/row:opacity-100 text-destructive hover:bg-destructive/10 transition-opacity">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
                    </button>
                  )}
                </td>
                {columns.map(col => {
                  const c = col.col_index
                  const key = `${rIdx}-${c}`
                  const isEditing = editing && sel?.r === rIdx && sel?.c === c
                  const selected = inSel(rIdx, c)
                  const isActive = sel?.r === rIdx && sel?.c === c
                  const isSaving = savingCells[key]
                  const lockedBy = live?.lockedByOther(`cell-${key}`) ?? null
                  return (
                    <td key={c}
                      onMouseDown={e => onCellMouseDown(e, rIdx, c)}
                      onMouseEnter={() => onCellEnter(rIdx, c)}
                      onDoubleClick={() => startEdit(rIdx, c)}
                      title={lockedBy ? `${lockedBy} is editing` : undefined}
                      className={`border-r border-border/50 p-0 relative ${selected && !isEditing ? 'bg-primary/10' : ''} ${isActive && !isEditing ? 'ring-2 ring-primary ring-inset' : ''} ${lockedBy ? 'bg-amber-500/10' : ''} ${canManage && !lockedBy ? 'cursor-cell' : ''}`}>
                      {isEditing ? (
                        <textarea ref={editRef} value={editValue} rows={1}
                          onChange={e => setEditValue(e.target.value)} onKeyDown={onEditKey}
                          onBlur={() => { commitEdit(); endEdit() }}
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
          Click + arrows to move · drag or Shift+arrows to select a range · Ctrl+C copies (paste into Excel/Sheets) · type/Enter to edit · Shift/Ctrl+Enter = new line · Delete clears · hover the row number for the delete (✕).
        </p>
      )}
    </div>
  )
}
