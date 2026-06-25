'use client'

import { deleteProject, updateProjectStatus, bulkDeleteProjects, bulkUpdateProjects } from './actions'
import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { StatusPills } from './status-pills'

type Project = {
  id: string
  title: string
  status: string
  type: string
  client_id: string
  description: string | null
  project_date?: string | null
  created_at?: string
  completed_at?: string | null
  clients?: { name: string }
}

type Client = { id: string; name: string }
type ViewMode = 'card' | 'list' | 'compact'

const DEFAULT_TYPES = ['Media Production', 'Event', 'Consultant', 'Other']
const DEFAULT_STATUSES = ['Active', 'Pending', 'Expedite', 'Completed']

const statusColors: Record<string, string> = {
  Active: 'bg-green-500/10 text-green-500 border-green-500/20',
  Expedite: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
  Completed: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  Done: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  Pending: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20',
}
// ponytail: custom statuses get a neutral badge, no per-status color config
const statusBadge = (s: string) => statusColors[s] ?? 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20'

function CardIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={active ? 'text-foreground' : 'text-muted-foreground'}>
      <rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity={active ? 1 : 0.5} />
      <rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity={active ? 1 : 0.5} />
      <rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity={active ? 1 : 0.5} />
      <rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity={active ? 1 : 0.5} />
    </svg>
  )
}

function ListIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={active ? 'text-foreground' : 'text-muted-foreground'}>
      <rect x="1" y="2" width="14" height="3" rx="1" fill="currentColor" opacity={active ? 1 : 0.5} />
      <rect x="1" y="7" width="14" height="3" rx="1" fill="currentColor" opacity={active ? 1 : 0.5} />
      <rect x="1" y="12" width="14" height="2" rx="1" fill="currentColor" opacity={active ? 1 : 0.5} />
    </svg>
  )
}

function CompactIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={active ? 'text-foreground' : 'text-muted-foreground'}>
      <rect x="1" y="2" width="14" height="1.5" rx="0.75" fill="currentColor" opacity={active ? 1 : 0.5} />
      <rect x="1" y="5.5" width="14" height="1.5" rx="0.75" fill="currentColor" opacity={active ? 1 : 0.5} />
      <rect x="1" y="9" width="14" height="1.5" rx="0.75" fill="currentColor" opacity={active ? 1 : 0.5} />
      <rect x="1" y="12.5" width="14" height="1.5" rx="0.75" fill="currentColor" opacity={active ? 1 : 0.5} />
    </svg>
  )
}

export function ProjectList({ projects, canManage, clients = [], statuses, types, isAdmin = false, writableClients = [] }: { projects: Project[]; canManage: boolean; clients?: Client[]; statuses?: string[]; types?: string[]; isAdmin?: boolean; writableClients?: string[] }) {
  const typeOpts = types?.length ? types : DEFAULT_TYPES
  const statusOpts = statuses?.length ? statuses : DEFAULT_STATUSES
  // Per-project edit right: admins edit all, PMs edit clients granted write
  const canEdit = (p: Project) => isAdmin || writableClients.includes(p.client_id)
  const router = useRouter()
  const [filter, setFilter] = useState<string>('All')
  const [view, setView] = useState<ViewMode>('card')
  useEffect(() => {
    const saved = localStorage.getItem('projectView') as ViewMode | null
    if (saved === 'card' || saved === 'list' || saved === 'compact') setView(saved)
  }, [])
  const changeView = (v: ViewMode) => { setView(v); localStorage.setItem('projectView', v) }
  const [selectMode, setSelectMode] = useState(false)
  const [hideCompleted, setHideCompleted] = useState(true)
  const [clientFilter, setClientFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<'date' | 'name' | 'client'>('date')
  const [sortAsc, setSortAsc] = useState(false) // default: latest first
  function flipSort(key: 'date' | 'name' | 'client') {
    if (key === sortKey) setSortAsc(a => !a)
    else { setSortKey(key); setSortAsc(key !== 'date') }
  }
  // treat Done / Completed (any casing) as "completed"
  const isCompleted = (s: string) => /^(done|complete)/i.test(s)
  // contractor client filter buttons: distinct clients present in their visible projects
  const clientButtons = !isAdmin
    ? Array.from(new Map(projects.map(p => [p.client_id, p.clients?.name ?? '—'])).entries())
    : []
  // admin: clients that currently have active/pending/expedite work
  const activeClientButtons = isAdmin
    ? Array.from(new Map(projects.filter(p => !isCompleted(p.status)).map(p => [p.client_id, p.clients?.name ?? '—'])).entries())
    : []
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function exitSelectMode() { setSelectMode(false); setSelected(new Set()) }

  // Bulk edit state
  const [bulkType, setBulkType] = useState('')
  const [bulkClientId, setBulkClientId] = useState('')
  const [bulkDate, setBulkDate] = useState('')
  const [bulkFeedback, setBulkFeedback] = useState<string | null>(null)

  let working = filter === 'All' ? projects : projects.filter(p => p.status === filter)
  if (hideCompleted) working = working.filter(p => !isCompleted(p.status))
  if (clientFilter !== 'all') working = working.filter(p => p.client_id === clientFilter)
  if (search.trim()) {
    const q = search.toLowerCase()
    working = working.filter(p =>
      p.title.toLowerCase().includes(q) ||
      (p.clients?.name ?? '').toLowerCase().includes(q) ||
      (p.description ?? '').toLowerCase().includes(q) ||
      p.type.toLowerCase().includes(q))
  }
  const dateOf = (p: Project) => p.project_date || p.created_at || ''
  const filteredProjects = [...working].sort((a, b) => {
    // When completed are shown, surface them on top, latest-completed first
    const ac = isCompleted(a.status), bc = isCompleted(b.status)
    if (ac !== bc) return ac ? -1 : 1
    if (ac && bc) return (b.completed_at || dateOf(b)).localeCompare(a.completed_at || dateOf(a))

    let r = 0
    if (sortKey === 'name') r = a.title.localeCompare(b.title)
    else if (sortKey === 'client') {
      r = (a.clients?.name ?? '').localeCompare(b.clients?.name ?? '')
      if (r === 0) return dateOf(b).localeCompare(dateOf(a)) // tiebreak: latest first
    } else r = dateOf(a).localeCompare(dateOf(b))
    return sortAsc ? r : -r
  })

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function deselectAll() { exitSelectMode() }

  async function handleDelete(id: string) {
    if (!confirm('Delete this project?')) return
    setDeletingId(id)
    await deleteProject(id)
    setDeletingId(null)
  }

  async function handleStatusChange(id: string, newStatus: string) {
    await updateProjectStatus(id, newStatus)
  }

  function handleBulkDelete() {
    if (!confirm(`Delete ${selected.size} projects? Cannot be undone.`)) return
    startTransition(async () => {
      const res = await bulkDeleteProjects([...selected])
      setBulkFeedback(res.error ? `Error: ${res.error}` : `${selected.size} projects deleted.`)
      setSelected(new Set())
      setTimeout(() => setBulkFeedback(null), 3000)
    })
  }

  function handleBulkUpdate() {
    if (!bulkType && !bulkClientId && !bulkDate) { setBulkFeedback('Set at least one field to update.'); return }
    startTransition(async () => {
      const fields: { type?: string; client_id?: string; project_date?: string } = {}
      if (bulkType) fields.type = bulkType
      if (bulkClientId) fields.client_id = bulkClientId
      if (bulkDate) fields.project_date = bulkDate
      const res = await bulkUpdateProjects([...selected], fields)
      setBulkFeedback(res.error ? `Error: ${res.error}` : `${selected.size} projects updated.`)
      setBulkType(''); setBulkClientId(''); setBulkDate('')
      setTimeout(() => setBulkFeedback(null), 3000)
    })
  }

  const selectClass = (id: string) =>
    selected.has(id) ? 'ring-2 ring-primary border-primary/50' : ''

  const StatusSelect = ({ project }: { project: Project }) =>
    canEdit(project) ? (
      <select
        value={project.status}
        onChange={e => handleStatusChange(project.id, e.target.value)}
        className="text-xs bg-secondary border border-border rounded-md px-2 py-1 text-muted-foreground focus:outline-none"
      >
        {statusOpts.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
    ) : null

  const inputCls = 'bg-background/50 border border-border rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/50'

  return (
    <div>
      {/* Bulk action bar */}
      {selected.size > 0 && canManage && (
        <div className="glass border border-primary/30 rounded-2xl p-4 mb-4 flex flex-wrap items-end gap-3 animate-in slide-in-from-top-2">
          <span className="text-sm font-semibold text-primary shrink-0">{selected.size} selected</span>

          <select value={bulkType} onChange={e => setBulkType(e.target.value)} className={inputCls}>
            <option value="">Change type…</option>
            {typeOpts.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          {clients.length > 0 && (
            <select value={bulkClientId} onChange={e => setBulkClientId(e.target.value)} className={inputCls}>
              <option value="">Change client…</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}

          <input type="date" value={bulkDate} onChange={e => setBulkDate(e.target.value)}
            className={inputCls} title="Change project date" />

          <button onClick={handleBulkUpdate} disabled={isPending}
            className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50">
            Apply
          </button>
          <button onClick={handleBulkDelete} disabled={isPending}
            className="px-3 py-1.5 bg-destructive/10 text-destructive rounded-md text-xs font-semibold hover:bg-destructive/20 transition-colors disabled:opacity-50">
            Delete all
          </button>

              <button onClick={exitSelectMode}
            className="px-3 py-1.5 border border-border rounded-md text-xs font-medium hover:bg-muted/50 transition-colors ml-auto">
            Exit Select
          </button>

          {bulkFeedback && (
            <p className={`text-xs w-full ${bulkFeedback.startsWith('Error') ? 'text-red-500' : 'text-green-500'}`}>
              {bulkFeedback}
            </p>
          )}
        </div>
      )}

      {/* Search */}
      <div className="relative mb-4">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search projects…"
          className="w-full bg-secondary/40 border border-border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
        {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-sm">✕</button>}
      </div>

      {/* Admin: active-client filter — single select */}
      {activeClientButtons.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 mb-4">
          <button onClick={() => setClientFilter('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${clientFilter === 'all' ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 text-muted-foreground hover:bg-secondary'}`}>
            All clients
          </button>
          {activeClientButtons.map(([id, name]) => (
            <button key={id} onClick={() => setClientFilter(id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${clientFilter === id ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 text-muted-foreground hover:bg-secondary'}`}>
              {name}
            </button>
          ))}
        </div>
      )}

      {/* Contractor client filter — single select */}
      {clientButtons.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 mb-4">
          <button onClick={() => setClientFilter('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              clientFilter === 'all' ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 text-muted-foreground hover:bg-secondary'
            }`}>
            All clients
          </button>
          {clientButtons.map(([id, name]) => (
            <button key={id} onClick={() => setClientFilter(id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                clientFilter === id ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 text-muted-foreground hover:bg-secondary'
              }`}>
              {name}
            </button>
          ))}
        </div>
      )}

      {/* Filters + view toggle */}
      <div className="flex flex-wrap items-center mb-6 gap-2">
        {canManage && (
          <button
            onClick={() => selectMode ? exitSelectMode() : setSelectMode(true)}
            className={`shrink-0 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
              selectMode ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted/50'
            }`}
          >
            {selectMode ? 'Selecting…' : 'Select'}
          </button>
        )}
        <StatusPills options={['All', ...statusOpts]} active={filter} onSelect={setFilter} />
        {([['date', 'Date'], ['name', 'Name'], ['client', 'Client']] as const).map(([key, label]) => (
          <button key={key} onClick={() => flipSort(key)} title="Click to sort · click again to flip"
            className={`shrink-0 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
              sortKey === key ? 'bg-primary/10 text-primary border-primary/30' : 'border-border hover:bg-muted/50'
            }`}>
            {label}{sortKey === key && (sortAsc ? ' ↑' : ' ↓')}
          </button>
        ))}
        <button onClick={() => setHideCompleted(h => !h)}
          className={`shrink-0 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
            hideCompleted ? 'bg-primary/10 text-primary border-primary/30' : 'border-border hover:bg-muted/50'
          }`}>
          {hideCompleted ? 'Show completed' : 'Hide completed'}
        </button>
        <div className="flex items-center gap-1 glass border border-border/50 rounded-lg p-1 shrink-0">
          {([['card', CardIcon], ['list', ListIcon], ['compact', CompactIcon]] as const).map(([mode, Icon]) => (
            <button key={mode} onClick={() => changeView(mode)} title={mode}
              className={`p-1.5 rounded-md transition-colors ${view === mode ? 'bg-primary/15' : 'hover:bg-muted/50'}`}>
              <Icon active={view === mode} />
            </button>
          ))}
        </div>
      </div>

      {filteredProjects.length === 0 ? (
        <div className="glass p-12 rounded-2xl border-border/50 text-center flex flex-col items-center">
          <svg className="text-muted-foreground/40 mb-3" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            {search ? <><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></> : <><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></>}
          </svg>
          <h3 className="text-lg font-medium mb-1">{search ? 'No matches' : 'No projects found'}</h3>
          <p className="text-sm text-muted-foreground">{search ? `Nothing matches “${search}”.` : filter === 'All' ? 'No projects yet — add one to get started.' : `No ${filter} projects.`}</p>
        </div>

      ) : view === 'card' ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map(project => (
            <div key={project.id}
              onClick={() => selectMode ? toggleSelect(project.id) : router.push(`/projects/${project.id}`)}
              className={`glass p-6 rounded-2xl border-border/50 flex flex-col group relative overflow-hidden cursor-pointer
                transition-all duration-200
                hover:shadow-[0_0_32px_4px_hsl(var(--primary)/0.18)] hover:border-primary/40 hover:-translate-y-0.5
                ${selectClass(project.id)}`}
              title={selectMode ? 'Click to select' : 'Click to open'}
            >
              {selected.has(project.id) && (
                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
              )}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-xl leading-tight mb-1 group-hover:text-primary transition-colors pr-6">
                    {project.title}
                  </h3>
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <span>{project.clients?.name || 'Unknown'}</span>
                    <span>•</span>
                    <span>{project.type}</span>
                  </div>
                </div>
                <div className={`px-2.5 py-1 rounded-full text-xs font-semibold border shrink-0 ${statusBadge(project.status)}`}>
                  {project.status}
                </div>
              </div>
              <p className="text-sm text-muted-foreground/80 line-clamp-2 mb-6 flex-1">
                {project.description || 'No description.'}
              </p>
              <div className="mt-auto pt-4 border-t border-border/50 flex items-center justify-between">
                <div onClick={e => e.stopPropagation()}><StatusSelect project={project} /></div>
                {canEdit(project) && (
                  <button onClick={e => { e.stopPropagation(); handleDelete(project.id) }}
                    disabled={deletingId === project.id}
                    className="text-xs text-destructive hover:underline opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50">
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

      ) : view === 'list' ? (
        <div className="glass rounded-2xl border border-border/50 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border/50 bg-muted/20">
              <tr>
                {canManage && selectMode && <th className="w-10 px-4 py-3" />}
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Project</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Client</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground w-48">Description</th>
                <th className="px-4 py-3 w-16" />
              </tr>
            </thead>
            <tbody>
              {filteredProjects.map((project, i) => (
                <tr key={project.id}
                  className={`border-b border-border/30 last:border-0 group ${i % 2 === 0 ? '' : 'bg-muted/5'} ${selected.has(project.id) ? 'bg-primary/5' : ''}`}>
                  {canManage && selectMode && (
                    <td className="px-4 py-3">
                      <button onClick={() => toggleSelect(project.id)}
                        className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${selected.has(project.id) ? 'bg-primary border-primary' : 'border-border hover:border-primary/60'}`}>
                        {selected.has(project.id) && <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1 4l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      </button>
                    </td>
                  )}
                  <td className="px-5 py-3 font-medium">
                    <span onClick={() => router.push(`/projects/${project.id}`)} className="hover:text-primary cursor-pointer transition-colors">
                      {project.title}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{project.clients?.name || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{project.type}</td>
                  <td className="px-4 py-3">
                    {canEdit(project)
                      ? <div onClick={e => e.stopPropagation()}><StatusSelect project={project} /></div>
                      : <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${statusBadge(project.status)}`}>{project.status}</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs max-w-[12rem] truncate">{project.description || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    {canEdit(project) && (
                      <button onClick={() => handleDelete(project.id)} disabled={deletingId === project.id}
                        className="text-xs text-destructive hover:underline opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50">
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      ) : (
        <div className="glass rounded-2xl border border-border/50 overflow-hidden divide-y divide-border/30">
          {filteredProjects.map(project => (
            <div key={project.id}
              className={`flex items-center gap-3 px-4 py-2 group hover:bg-muted/10 transition-colors ${selected.has(project.id) ? 'bg-primary/5' : ''}`}>
              {canManage && selectMode && (
                <button onClick={() => toggleSelect(project.id)}
                  className={`w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition-colors ${selected.has(project.id) ? 'bg-primary border-primary' : 'border-border hover:border-primary/60'}`}>
                  {selected.has(project.id) && <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1 4l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </button>
              )}
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                project.status === 'Active' ? 'bg-green-500' :
                project.status === 'Expedite' ? 'bg-amber-500' :
                /complete|done/i.test(project.status) ? 'bg-blue-500' : 'bg-zinc-400'}`} />
              <span onClick={() => router.push(`/projects/${project.id}`)}
                className="font-medium text-sm hover:text-primary cursor-pointer transition-colors flex-1 truncate">
                {project.title}
              </span>
              <span className="text-xs text-muted-foreground hidden sm:block truncate max-w-[8rem]">{project.clients?.name}</span>
              <span className="text-xs text-muted-foreground hidden md:block">{project.type}</span>
              {canEdit(project)
                ? <div onClick={e => e.stopPropagation()}><StatusSelect project={project} /></div>
                : <span className={`text-xs font-medium ${
                    project.status === 'Active' ? 'text-green-500' :
                    project.status === 'Expedite' ? 'text-amber-600' :
                    /complete|done/i.test(project.status) ? 'text-blue-500' : 'text-zinc-400'}`}>{project.status}</span>
              }
              {canEdit(project) && (
                <button onClick={() => handleDelete(project.id)} disabled={deletingId === project.id}
                  className="text-xs text-destructive hover:underline opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50 ml-1">
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {canManage && filteredProjects.length > 0 && (
        <p className="text-xs text-muted-foreground mt-3">
          {selectMode ? 'Click to select · Exit Select when done' : 'Click card to open · Use Select button to multi-select'}
          {selected.size > 0 && <> · <button onClick={deselectAll} className="text-primary hover:underline">Deselect all ({selected.size})</button></>}
        </p>
      )}
    </div>
  )
}
