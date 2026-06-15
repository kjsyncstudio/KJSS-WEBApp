'use client'

import { useState } from 'react'
import { saveGridCell, updateGridColumn } from './notes-actions'

type GridColumn = {
  col_index: number
  header: string
}

type GridCell = {
  row_index: number
  col_index: number
  value: string
}

export function ExcelGrid({ 
  projectId, 
  initialColumns, 
  initialCells,
  canManage
}: { 
  projectId: string
  initialColumns: GridColumn[]
  initialCells: GridCell[]
  canManage: boolean
}) {
  // Ensure we have at least 2 columns and 1 row by default if empty
  const [columns, setColumns] = useState<GridColumn[]>(() => {
    if (initialColumns.length > 0) return initialColumns
    return [
      { col_index: 0, header: 'Column A' },
      { col_index: 1, header: 'Column B' }
    ]
  })

  // Group cells by row
  const maxRowIndex = initialCells.length > 0 ? Math.max(...initialCells.map(c => c.row_index)) : 0
  const [rowCount, setRowCount] = useState(maxRowIndex + 1)
  const [cells, setCells] = useState<GridCell[]>(initialCells)

  const [savingCells, setSavingCells] = useState<Record<string, boolean>>({})

  // Add Row
  function handleAddRow() {
    setRowCount(prev => prev + 1)
  }

  // Add Column
  function handleAddColumn() {
    if (columns.length >= 5) return // Max 5 columns limit
    const newColIndex = columns.length
    const newColumn = { col_index: newColIndex, header: `Column ${String.fromCharCode(65 + newColIndex)}` }
    setColumns([...columns, newColumn])
    
    // Auto-save the new column immediately if we have permissions
    if (canManage) {
      updateGridColumn(projectId, newColumn.col_index, newColumn.header)
    }
  }

  // Handle Cell Change
  async function handleCellChange(rowIndex: number, colIndex: number, value: string) {
    // Optimistic update
    const existingIndex = cells.findIndex(c => c.row_index === rowIndex && c.col_index === colIndex)
    let newCells = [...cells]
    
    if (existingIndex >= 0) {
      newCells[existingIndex] = { ...newCells[existingIndex], value }
    } else {
      newCells.push({ row_index: rowIndex, col_index: colIndex, value })
    }
    setCells(newCells)

    if (!canManage) return

    // Debounce/save logic inline for simplicity in UX
    const cellKey = `${rowIndex}-${colIndex}`
    setSavingCells(prev => ({ ...prev, [cellKey]: true }))
    await saveGridCell(projectId, rowIndex, colIndex, value)
    setSavingCells(prev => ({ ...prev, [cellKey]: false }))
  }

  async function handleHeaderChange(colIndex: number, header: string) {
    const newCols = [...columns]
    const idx = newCols.findIndex(c => c.col_index === colIndex)
    if (idx >= 0) {
      newCols[idx] = { ...newCols[idx], header }
      setColumns(newCols)
      if (canManage) {
        await updateGridColumn(projectId, colIndex, header)
      }
    }
  }

  // Render grid
  return (
    <div className="glass rounded-2xl border-border/50 flex flex-col overflow-hidden mb-8">
      <div className="bg-secondary/50 px-4 py-3 border-b border-border/50 flex justify-between items-center">
        <h3 className="font-semibold text-sm">Project Sheet (Excel-like)</h3>
        {canManage && (
          <div className="flex gap-2">
            <button 
              onClick={handleAddColumn}
              disabled={columns.length >= 5}
              className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-md font-medium hover:bg-primary/20 transition-colors disabled:opacity-50"
            >
              + Add Column
            </button>
            <button 
              onClick={handleAddRow}
              className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-md font-medium hover:bg-primary/20 transition-colors"
            >
              + Add Row
            </button>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left border-collapse">
          <thead className="text-xs uppercase bg-secondary/20">
            <tr>
              <th className="w-12 border-b border-r border-border/50 text-center py-2 text-muted-foreground bg-secondary/40">#</th>
              {columns.map((col) => (
                <th key={col.col_index} className="border-b border-r border-border/50 relative group min-w-[150px]">
                  <input
                    type="text"
                    value={col.header}
                    onChange={(e) => handleHeaderChange(col.col_index, e.target.value)}
                    disabled={!canManage}
                    className="w-full bg-transparent px-4 py-2 font-semibold focus:outline-none focus:bg-secondary/20 text-foreground"
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rowCount }).map((_, rIdx) => (
              <tr key={rIdx} className="border-b border-border/50 hover:bg-secondary/5 transition-colors">
                <td className="border-r border-border/50 text-center text-muted-foreground bg-secondary/10 w-12 font-medium">
                  {rIdx + 1}
                </td>
                {columns.map((col) => {
                  const cell = cells.find(c => c.row_index === rIdx && c.col_index === col.col_index)
                  const isSaving = savingCells[`${rIdx}-${col.col_index}`]
                  
                  return (
                    <td key={col.col_index} className="border-r border-border/50 relative p-0 group">
                      <input
                        type="text"
                        value={cell?.value || ''}
                        onChange={(e) => handleCellChange(rIdx, col.col_index, e.target.value)}
                        disabled={!canManage}
                        className={`w-full bg-transparent px-4 py-2 focus:outline-none focus:bg-secondary/20 transition-colors ${isSaving ? 'opacity-50' : ''}`}
                        placeholder="..."
                      />
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
