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
  clients?: {
    name: string
  }
}

export function ProjectList({ projects, canManage }: { projects: Project[], canManage: boolean }) {
  const [filter, setFilter] = useState<string>('All')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const filteredProjects = filter === 'All' ? projects : projects.filter(p => p.status === filter)

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this project?')) return
    setDeletingId(id)
    await deleteProject(id)
    setDeletingId(null)
  }

  async function handleStatusChange(id: string, newStatus: string) {
    setUpdatingId(id)
    await updateProjectStatus(id, newStatus)
    setUpdatingId(null)
  }

  const statusColors = {
    Active: 'bg-green-500/10 text-green-500 border-green-500/20',
    Done: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    Shelved: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    Pending: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20',
  }

  return (
    <div>
      {/* Filters */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
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

      {filteredProjects.length === 0 ? (
        <div className="glass p-12 rounded-2xl border-border/50 text-center flex flex-col items-center justify-center">
          <h3 className="text-xl font-medium text-muted-foreground mb-2">No Projects Found</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            {filter === 'All' ? "You don't have any projects yet." : `You don't have any ${filter} projects.`}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => (
            <div key={project.id} className="glass p-6 rounded-2xl border-border/50 flex flex-col group relative overflow-hidden transition-all hover:shadow-xl hover:border-primary/20">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-xl leading-tight mb-1">
                    <Link href={`/projects/${project.id}`} className="hover:text-primary transition-colors">
                      {project.title}
                    </Link>
                  </h3>
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <span>{project.clients?.name || 'Unknown Client'}</span>
                    <span>•</span>
                    <span>{project.type}</span>
                  </div>
                </div>
                <div className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${statusColors[project.status]}`}>
                  {project.status}
                </div>
              </div>
              
              <p className="text-sm text-muted-foreground/80 line-clamp-2 mb-6 flex-1">
                {project.description || 'No description provided.'}
              </p>
              
              <div className="mt-auto pt-4 border-t border-border/50 flex items-center justify-between">
                {canManage ? (
                  <select 
                    value={project.status}
                    onChange={(e) => handleStatusChange(project.id, e.target.value)}
                    disabled={updatingId === project.id}
                    className="text-xs bg-secondary border border-border rounded-md px-2 py-1 text-muted-foreground focus:outline-none"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Active">Active</option>
                    <option value="Shelved">Shelved</option>
                    <option value="Done">Done</option>
                  </select>
                ) : (
                  <Link href={`/projects/${project.id}`} className="text-xs font-medium text-primary hover:underline">
                    View Details →
                  </Link>
                )}
                
                {canManage && (
                  <div className="flex gap-3">
                    <Link href={`/projects/${project.id}`} className="text-xs text-primary hover:underline">
                      Open
                    </Link>
                    <button 
                      onClick={() => handleDelete(project.id)}
                      disabled={deletingId === project.id}
                      className="text-xs text-destructive hover:underline opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
