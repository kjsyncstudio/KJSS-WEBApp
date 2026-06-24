'use client'

import { deleteProject, updateProjectStatus } from './actions'
import { useState } from 'react'
import Link from 'next/link'

type Project = {
  id: string
  title: string
  status: 'Active' | 'Done' | 'Shelved' | 'Pending'
  type: string
  client_id: string
  description: string | null
  clients?: { name: string }
}

type ViewMode = 'card' | 'list' | 'compact'

const statusColors = {
  Active: 'bg-green-500/10 text-green-500 border-green-500/20',
  Done: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  Shelved: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  Pending: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20',
}

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

export function ProjectList({ projects, canManage }: { projects: Project[]; canManage: boolean }) {
  const [filter, setFilter] = useState<string>('All')
  const [view, setView] = useState<ViewMode>('card')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const filteredProjects = filter === 'All' ? projects : projects.filter(p => p.status === filter)

  async function handleDelete(id: string) {
    if (!confirm('Delete this project?')) return
    setDeletingId(id)
    await deleteProject(id)
    setDeletingId(null)
  }

  async function handleStatusChange(id: string, newStatus: string) {
    setUpdatingId(id)
    await updateProjectStatus(id, newStatus)
    setUpdatingId(null)
  }

  const StatusSelect = ({ project }: { project: Project }) =>
    canManage ? (
      <select
        value={project.status}
        onChange={e => handleStatusChange(project.id, e.target.value)}
        disabled={updatingId === project.id}
        className="text-xs bg-secondary border border-border rounded-md px-2 py-1 text-muted-foreground focus:outline-none"
      >
        <option value="Pending">Pending</option>
        <option value="Active">Active</option>
        <option value="Shelved">Shelved</option>
        <option value="Done">Done</option>
      </select>
    ) : null

  return (
    <div>
      {/* Filters + view toggle */}
      <div className="flex items-center justify-between mb-6 gap-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {['All', 'Active', 'Pending', 'Shelved', 'Done'].map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                filter === status
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-secondary/50 text-muted-foreground hover:bg-secondary'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 glass border border-border/50 rounded-lg p-1 shrink-0">
          {([['card', CardIcon], ['list', ListIcon], ['compact', CompactIcon]] as const).map(([mode, Icon]) => (
            <button
              key={mode}
              onClick={() => setView(mode)}
              title={mode.charAt(0).toUpperCase() + mode.slice(1)}
              className={`p-1.5 rounded-md transition-colors ${view === mode ? 'bg-primary/15' : 'hover:bg-muted/50'}`}
            >
              <Icon active={view === mode} />
            </button>
          ))}
        </div>
      </div>

      {filteredProjects.length === 0 ? (
        <div className="glass p-12 rounded-2xl border-border/50 text-center flex flex-col items-center justify-center">
          <h3 className="text-xl font-medium text-muted-foreground mb-2">No Projects Found</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            {filter === 'All' ? "No projects yet." : `No ${filter} projects.`}
          </p>
        </div>
      ) : view === 'card' ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map(project => (
            <div key={project.id} className="glass p-6 rounded-2xl border-border/50 flex flex-col group relative overflow-hidden transition-all hover:shadow-xl hover:border-primary/20">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-xl leading-tight mb-1">
                    <Link href={`/projects/${project.id}`} className="hover:text-primary transition-colors">
                      {project.title}
                    </Link>
                  </h3>
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <span>{project.clients?.name || 'Unknown'}</span>
                    <span>•</span>
                    <span>{project.type}</span>
                  </div>
                </div>
                <div className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${statusColors[project.status]}`}>
                  {project.status}
                </div>
              </div>
              <p className="text-sm text-muted-foreground/80 line-clamp-2 mb-6 flex-1">
                {project.description || 'No description.'}
              </p>
              <div className="mt-auto pt-4 border-t border-border/50 flex items-center justify-between">
                <StatusSelect project={project} />
                {!canManage && (
                  <Link href={`/projects/${project.id}`} className="text-xs font-medium text-primary hover:underline">
                    View Details →
                  </Link>
                )}
                {canManage && (
                  <div className="flex gap-3">
                    <Link href={`/projects/${project.id}`} className="text-xs text-primary hover:underline">Open</Link>
                    <button onClick={() => handleDelete(project.id)} disabled={deletingId === project.id}
                      className="text-xs text-destructive hover:underline opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50">
                      Delete
                    </button>
                  </div>
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
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Project</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Client</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground w-48">Description</th>
                <th className="px-4 py-3 w-24" />
              </tr>
            </thead>
            <tbody>
              {filteredProjects.map((project, i) => (
                <tr key={project.id} className={`border-b border-border/30 last:border-0 group ${i % 2 === 0 ? '' : 'bg-muted/5'}`}>
                  <td className="px-5 py-3 font-medium">
                    <Link href={`/projects/${project.id}`} className="hover:text-primary transition-colors">
                      {project.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{project.clients?.name || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{project.type}</td>
                  <td className="px-4 py-3">
                    {canManage
                      ? <StatusSelect project={project} />
                      : <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${statusColors[project.status]}`}>{project.status}</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs max-w-[12rem] truncate">{project.description || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-3 justify-end">
                      <Link href={`/projects/${project.id}`} className="text-xs text-primary hover:underline">Open</Link>
                      {canManage && (
                        <button onClick={() => handleDelete(project.id)} disabled={deletingId === project.id}
                          className="text-xs text-destructive hover:underline opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50">
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* compact */
        <div className="glass rounded-2xl border border-border/50 overflow-hidden divide-y divide-border/30">
          {filteredProjects.map(project => (
            <div key={project.id} className="flex items-center gap-3 px-4 py-2 group hover:bg-muted/10 transition-colors">
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                project.status === 'Active' ? 'bg-green-500' :
                project.status === 'Done' ? 'bg-blue-500' :
                project.status === 'Shelved' ? 'bg-orange-500' : 'bg-zinc-400'
              }`} />
              <Link href={`/projects/${project.id}`} className="font-medium text-sm hover:text-primary transition-colors flex-1 truncate">
                {project.title}
              </Link>
              <span className="text-xs text-muted-foreground hidden sm:block truncate max-w-[8rem]">{project.clients?.name}</span>
              <span className="text-xs text-muted-foreground hidden md:block">{project.type}</span>
              {canManage
                ? <StatusSelect project={project} />
                : <span className={`text-xs font-medium ${
                    project.status === 'Active' ? 'text-green-500' :
                    project.status === 'Done' ? 'text-blue-500' :
                    project.status === 'Shelved' ? 'text-orange-500' : 'text-zinc-400'
                  }`}>{project.status}</span>
              }
              {canManage && (
                <button onClick={() => handleDelete(project.id)} disabled={deletingId === project.id}
                  className="text-xs text-destructive hover:underline opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50 ml-1">
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
