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
const DEFAULT_STATUSES = ['Active', 'Pending', 'Expedite', 'Completed']

interface ErrorResolverProps {
  errorRows: ErrorRow[]
  clients: Client[]
  validStatuses?: string[]
  onRow: (row: ResolvedRow, newClients: Client[]) => void  // emit each resolved entry live
  onClose: () => void
}

type ClientResolution = { clientId: string; clientName: string }

export function ErrorResolver({ errorRows, clients: initialClients, validStatuses, onRow, onClose }: ErrorResolverProps) {
  const VALID_STATUSES = validStatuses?.length ? validStatuses : DEFAULT_STATUSES
  const [index, setIndex] = useState(0)
  const [clients, setClients] = useState<Client[]>(initialClients)
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
  // keep the client picker visible for any row that started with a client problem
  const rowHadClientError = current.errors.some(e => e.toLowerCase().includes('not found'))
  const selectedClientName = clients.find(c => c.id === effectiveClientId)?.name

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

  const newClients = () => clients.filter(c => !initialClients.find(ic => ic.id === c.id))

  function advance(nextIndex: number) {
    if (nextIndex >= errorRows.length) onClose()
    else {
      setIndex(nextIndex)
      setSelectedClientId('')
      setSelectedStatus('')
      setCreatingClient(false)
    }
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

    // emit current resolved entry live (pops up behind the modal)
    onRow({
      title: current.title,
      clientId: effectiveClientId,
      type: VALID_TYPES.includes(current.type) ? current.type : 'Other',
      status: effectiveStatus,
      description: current.description,
      projectDate: current.projectDate,
    }, newClients())

    // auto-resolve & emit subsequent rows that now match from memory
    let nextIndex = index + 1
    while (nextIndex < errorRows.length) {
      const next = errorRows[nextIndex]
      const autoClient = newMemoryClient[next.rawClientName]?.clientId || next.clientId
      const autoStatus = newMemoryStatus[next.rawClientName + next.title] || next.status
      const autoType = VALID_TYPES.includes(next.type) ? next.type : null
      const clientFound = clients.find(c => c.id === autoClient)
      if (clientFound && VALID_STATUSES.includes(autoStatus) && autoType) {
        onRow({ title: next.title, clientId: autoClient, type: autoType, status: autoStatus, description: next.description, projectDate: next.projectDate }, newClients())
        nextIndex++
      } else break
    }

    advance(nextIndex)
  }

  function handleSkip() {
    advance(index + 1)
  }

  function handleSkipRest() {
    onClose()
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
            {current.errors.filter(e => {
              const low = e.toLowerCase()
              if (low.includes('not found') && selectedClientName) return false  // client resolved
              if (low.includes('status') && !hasStatusError) return false        // status resolved
              return true
            }).map((e, i) => (
              <span key={i} className="bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full">{e}</span>
            ))}
          </div>
        </div>

        {/* Client resolution */}
        {rowHadClientError && (
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {selectedClientName
                ? <>Confirm project belongs to <span className="text-primary font-semibold">&quot;{selectedClientName}&quot;</span>?</>
                : <>Client <span className="text-red-500 font-normal">&quot;{current.rawClientName}&quot; not found</span></>}
            </label>

            {!selectedClientName && autoClient && (
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

        <div className="flex flex-wrap gap-2 pt-2">
          <button type="button" onClick={onClose}
            className="px-3 py-2 border border-border rounded-md text-sm font-medium hover:bg-muted/50 transition-colors">
            Close
          </button>
          <button type="button" onClick={handleSkip}
            className="px-3 py-2 border border-border rounded-md text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors">
            Skip
          </button>
          <button type="button" onClick={handleSkipRest}
            className="px-3 py-2 border border-border rounded-md text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors">
            Skip rest
          </button>
          <button type="button" onClick={handleNext} disabled={!canProceed}
            className="flex-1 py-2 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50">
            {index + 1 < errorRows.length ? 'Add & next →' : 'Add & finish'}
          </button>
        </div>
      </div>
    </div>
  )
}
