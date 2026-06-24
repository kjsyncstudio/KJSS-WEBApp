'use client'

import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import { createClient } from '@/utils/supabase/client'

type RemoteHandler = (row: Record<string, unknown>) => void

type BroadcastHandler = (payload: Record<string, unknown>) => void

type LiveCtx = {
  me: string
  locks: Record<string, string>        // field -> email of whoever holds it
  lock: (field: string) => void
  unlock: (field: string) => void
  lockedByOther: (field: string) => string | null
  onRemote: (table: string, cb: RemoteHandler) => () => void
  broadcast: (event: string, payload: Record<string, unknown>) => void   // instant keystroke sync
  onBroadcast: (event: string, cb: BroadcastHandler) => () => void
}

const Ctx = createContext<LiveCtx | null>(null)
export const useProjectLive = () => useContext(Ctx)

const TABLES = ['projects', 'project_text_notes', 'project_grid_cells', 'project_grid_columns']

export function ProjectLiveProvider({ projectId, userEmail, children }: { projectId: string; userEmail: string; children: ReactNode }) {
  const [locks, setLocks] = useState<Record<string, string>>({})
  const handlers = useRef<Record<string, Set<RemoteHandler>>>({})
  const bHandlers = useRef<Record<string, Set<BroadcastHandler>>>({})
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)
  const myField = useRef<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel(`proj-${projectId}`, {
      config: { presence: { key: userEmail }, broadcast: { self: false } },
    })

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState() as Record<string, { field?: string | null; email?: string }[]>
      const next: Record<string, string> = {}
      for (const key in state) for (const meta of state[key]) if (meta.field && meta.email) next[meta.field] = meta.email
      setLocks(next)
    })

    for (const table of TABLES) {
      const filter = table === 'projects' ? `id=eq.${projectId}` : `project_id=eq.${projectId}`
      channel.on('postgres_changes', { event: '*', schema: 'public', table, filter }, payload => {
        const row = (payload.new ?? payload.old) as Record<string, unknown>
        handlers.current[table]?.forEach(cb => cb(row))
      })
    }

    // Instant keystroke sync (no DB round-trip)
    channel.on('broadcast', { event: 'edit' }, ({ payload }) => {
      const { event, ...rest } = (payload ?? {}) as { event?: string } & Record<string, unknown>
      if (event) bHandlers.current[event]?.forEach(cb => cb(rest))
    })

    channel.subscribe(status => { if (status === 'SUBSCRIBED') channel.track({ field: null, email: userEmail }) })
    channelRef.current = channel
    return () => { supabase.removeChannel(channel) }
  }, [projectId, userEmail])

  const lock = useCallback((field: string) => {
    myField.current = field
    channelRef.current?.track({ field, email: userEmail })
  }, [userEmail])

  const unlock = useCallback((field: string) => {
    if (myField.current === field) myField.current = null
    channelRef.current?.track({ field: null, email: userEmail })
  }, [userEmail])

  const lockedByOther = useCallback((field: string) => {
    const holder = locks[field]
    return holder && holder !== userEmail ? holder : null
  }, [locks, userEmail])

  const onRemote = useCallback((table: string, cb: RemoteHandler) => {
    (handlers.current[table] ??= new Set()).add(cb)
    return () => { handlers.current[table]?.delete(cb) }
  }, [])

  const broadcast = useCallback((event: string, payload: Record<string, unknown>) => {
    channelRef.current?.send({ type: 'broadcast', event: 'edit', payload: { event, ...payload } })
  }, [])

  const onBroadcast = useCallback((event: string, cb: BroadcastHandler) => {
    (bHandlers.current[event] ??= new Set()).add(cb)
    return () => { bHandlers.current[event]?.delete(cb) }
  }, [])

  return (
    <Ctx.Provider value={{ me: userEmail, locks, lock, unlock, lockedByOther, onRemote, broadcast, onBroadcast }}>
      {children}
    </Ctx.Provider>
  )
}
