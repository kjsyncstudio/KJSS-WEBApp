'use client'

import { useState } from 'react'
import { createClient as createSupabaseClient } from '@/utils/supabase/client'

export type ResolvedRow = {
  title: string
  clientId: string
  type: string
  status: string
  description: string
  projectDate: string
}

export type ErrorRow = ResolvedRow & {
  rawClientName: string
  errors: string[]
}

type Client = { id: string; name: string }

const VALID_TYPES = ['Media Production', 'Event', 'Consultant', 'Other']
const VALID_STATUSES = ['Active', 'Pending', 'Shelved', 'Done']

interface ErrorResolverProps {
  errorRows: ErrorRow[]
  clients: Client[]
  onResolved: (rows: ResolvedRow[], newClients: Client[]) => void
  onCancel: () => void
}

type ClientResolution = { clientId: string; clientName: string }

export function ErrorResolver({ errorRows, clients: initialClients, onResolved, onCancel }: ErrorResolverProps) {
  const [index, setIndex] = useState(0)
  const [clients, setClients] = useState<Client[]>(initialClients)
  const [resolved, setResolved] = useState<ResolvedRow[]>([])
  // memory: raw client name → resolution
  const [clientMemory, setClientMemory] = useState<Record<string, ClientResolution>>({})
  const [statusMemory, setStatusMemory] = useState<Record<string, string>>({})

  // Per-row edit state
  const [selectedClientId, setSelectedClientId] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [creatingClient, setCreatingClient] = useState(false)
  const [newClientName, setNewClientName] = useState('')
  const [newClientIndustry, setNewClientIndustry] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  const current = errorRows[index]
  if (!current) return null

  // Auto-apply memory when row changes
  const effectiveClientId = selectedClientId || clientMemory[current.rawClientName]?.clientId || current.clientId
  const effectiveStatus = selectedStatus || statusMemory[current.rawClientName + current.title] || current.status

  const hasClientError = !effectiveClientId || !clients.find(c => c.id === effectiveClientId)
  const hasStatusError = !VALID_STATUSES.includes(effectiveStatus)
  const canProceed = !hasClientError && !hasStatusError

  async function handleCreateClient() {
    if (!newClientName.trim() || !newClientIndustry.trim()) { setCreateError('Name and industry required.'); return }
    setCreating(true)
    setCreateError('')
    const supabase = createSupabaseClient()
    const { data, error } = await supabase.from('clients').insert({
      name: newClientName.trim(),
      industry: newClientIndustry.trim(),
      year_start: new Date().getFullYear(),
    }).select('id, name').single()
    setCreating(false)
    if (error) { setCreateError(error.message); return }
    const newClient = { id: data.id, name: data.name }
    setClients(prev => [...prev, newClient])
    setSelectedClientId(newClient.id)
    setClientMemory(prev => ({ ...prev, [current.rawClientName]: { clientId: newClient.id, clientName: newClient.name } }))
    setCreatingClient(false)
    setNewClientName('')
    setNewClientIndustry('')
  }

  function handleNext() {
    const newMemoryClient = selectedClientId
      ? { ...clientMemory, [current.rawClientName]: { clientId: selectedClientId, clientName: clients.find(c => c.id === selectedClientId)?.name ?? '' } }
      : clientMemory
    const newMemoryStatus = selectedStatus
      ? { ...statusMemory, [current.rawClientName + current.title]: selectedStatus }
      : statusMemory

    setClientMemory(newMemoryClient)
    setStatusMemory(newMemoryStatus)

    const row: ResolvedRow = {
      title: current.title,
      clientId: effectiveClientId,
      type: VALID_TYPES.includes(current.type) ? current.type : 'Other',
      status: effectiveStatus,
      description: current.description,
      projectDate: current.projectDate,
    }

    const nextResolved = [...resolved, row]

    // Check if next rows can be auto-resolved using updated memory
    let nextIndex = index + 1
    const autoResolved: ResolvedRow[] = []

    while (nextIndex < errorRows.length) {
      const next = errorRows[nextIndex]
      const autoClient = newMemoryClient[next.rawClientName]?.clientId || next.clientId
      const autoStatus = newMemoryStatus[next.rawClientName + next.title] || next.status
      const autoType = VALID_TYPES.includes(next.type) ? next.type : null

      const clientOk = !!autoClient && !!clients.find(c => c.id === autoClient) || !![...clients, ...autoResolved.map((_, i) => ({ id: '', name: '' }))].find(c => c.id === autoClient)
      const statusOk = VALID_STATUSES.includes(autoStatus)
      const typeOk = !!autoType

      // re-check with updated clients list
      const clientFound = [...clients, ...(nextIndex > 0 ? [] : [])].find(c => c.id === autoClient)

      if (clientFound && statusOk && typeOk) {
        autoResolved.push({
          title: next.title,
          clientId: autoClient,
          type: autoType!,
          status: autoStatus,
          description: next.description,
          projectDate: next.projectDate,
        })
        nextIndex++
      } else {
        break
      }
    }

    if (nextIndex >= errorRows.length) {
      // all done
      const newClientsList = clients.filter(c => !initialClients.find(ic => ic.id === c.id))
      onResolved([...nextResolved, ...autoResolved], newClientsList)
    } else {
      setResolved([...nextResolved, ...autoResolved])
      setIndex(nextIndex)
      setSelectedClientId('')
      setSelectedStatus('')
      setCreatingClient(false)
    }
  }

  const progress = `${index + 1} / ${errorRows.length}`
  const autoClient = clientMemory[current.rawClientName]
  const autoStatus = statusMemory[current.rawClientName + current.title]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="glass border border-border/50 rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">Resolve Import Errors</h3>
          <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-full">{progress}</span>
        </div>

        {/* Row summary */}
        <div className="glass bg-muted/20 rounded-xl p-4 space-y-1">
          <p className="font-semibold text-sm">{current.title}</p>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {current.errors.map((e, i) => (
              <span key={i} className="bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full">{e}</span>
            ))}
          </div>
        </div>

        {/* Client resolution */}
        {hasClientError && (
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Client <span className="text-muted-foreground font-normal">"{current.rawClientName}" not found</span>
            </label>

            {autoClient && (
              <p className="text-xs text-primary">Auto-applying previous resolution: {autoClient.clientName}</p>
            )}

            {!creatingClient ? (
              <div className="flex gap-2">
                <select
                  value={selectedClientId || autoClient?.clientId || ''}
                  onChange={e => setSelectedClientId(e.target.value)}
                  className="flex-1 bg-background/50 border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">Select existing client…</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button type="button" onClick={() => { setCreatingClient(true); setNewClientName(current.rawClientName) }}
                  className="px-3 py-2 border border-border rounded-md text-xs font-medium hover:bg-muted/50 transition-colors whitespace-nowrap">
                  + Create
                </button>
              </div>
            ) : (
              <div className="glass bg-muted/10 rounded-xl p-3 space-y-2">
                <p className="text-xs font-medium">Create new client</p>
                <input value={newClientName} onChange={e => setNewClientName(e.target.value)}
                  placeholder="Client name *"
                  className="w-full bg-background/50 border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                <input value={newClientIndustry} onChange={e => setNewClientIndustry(e.target.value)}
                  placeholder="Industry *"
                  className="w-full bg-background/50 border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                {createError && <p className="text-xs text-red-500">{createError}</p>}
                <div className="flex gap-2">
                  <button type="button" onClick={handleCreateClient} disabled={creating}
                    className="flex-1 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50">
                    {creating ? 'Creating…' : 'Create client'}
                  </button>
                  <button type="button" onClick={() => { setCreatingClient(false); setCreateError('') }}
                    className="px-3 py-1.5 border border-border rounded-md text-xs hover:bg-muted/50 transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Status resolution */}
        {hasStatusError && (
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Status <span className="text-muted-foreground font-normal">"{current.status}" is invalid</span>
            </label>
            <select
              value={selectedStatus || autoStatus || ''}
              onChange={e => setSelectedStatus(e.target.value)}
              className="w-full bg-background/50 border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="">Select status…</option>
              {VALID_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onCancel}
            className="px-4 py-2 border border-border rounded-md text-sm font-medium hover:bg-muted/50 transition-colors">
            Cancel import
          </button>
          <button type="button" onClick={handleNext} disabled={!canProceed}
            className="flex-1 py-2 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50">
            {index + 1 < errorRows.length ? 'Next →' : 'Finish & import'}
          </button>
        </div>
      </div>
    </div>
  )
}
