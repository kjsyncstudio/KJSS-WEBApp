'use client'

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import type { ReactNode } from 'react'

type UndoEntry = { label: string; revert: () => void | Promise<void> }

type UndoCtx = { push: (e: UndoEntry) => void; undo: () => void; count: number; last?: string }
const Ctx = createContext<UndoCtx | null>(null)
export const useUndo = () => useContext(Ctx)

const MAX = 20

export function UndoProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<UndoEntry[]>([])
  const reverting = useRef(false)

  const push = useCallback((e: UndoEntry) => {
    if (reverting.current) return // don't record the revert itself
    setStack(s => [...s, e].slice(-MAX))
  }, [])

  const undo = useCallback(() => {
    setStack(s => {
      if (s.length === 0) return s
      const next = s.slice(0, -1)
      const entry = s[s.length - 1]
      reverting.current = true
      Promise.resolve(entry.revert()).finally(() => { reverting.current = false })
      return next
    })
  }, [])

  // Ctrl/Cmd+Z when focus is NOT inside an editable field (those keep native undo)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'z' || e.shiftKey) return
      const t = e.target as HTMLElement | null
      const editable = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)
      if (editable) return
      e.preventDefault()
      undo()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo])

  return (
    <Ctx.Provider value={{ push, undo, count: stack.length, last: stack[stack.length - 1]?.label }}>
      {children}
      {stack.length > 0 && (
        <button onClick={undo} title={`Undo ${stack[stack.length - 1]?.label ?? ''} (Ctrl+Z)`}
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full bg-foreground text-background shadow-xl hover:opacity-90 transition-opacity text-sm font-medium">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 14 4 9l5-5" /><path d="M4 9h11a4 4 0 0 1 0 8h-1" /></svg>
          Undo <span className="opacity-60 text-xs">{stack.length}</span>
        </button>
      )}
    </Ctx.Provider>
  )
}
