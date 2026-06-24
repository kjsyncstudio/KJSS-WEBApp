'use client'

import { useState } from 'react'
import { addProject } from './actions'

type Client = {
  id: string
  name: string
}

export function ProjectForm({ clients }: { clients: Client[] }) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function onSubmit(formData: FormData) {
    setLoading(true)
    await addProject(formData)
    setLoading(false)
    setIsOpen(false)
  }

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium text-sm hover:bg-primary/90 transition-colors shadow-lg hover:shadow-primary/20"
      >
        + Add Project
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="glass p-6 rounded-2xl border-border/50 w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold">New Project</h3>
          <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground">
            ✕
          </button>
        </div>
        <form action={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="title" className="text-sm font-medium">Project Title *</label>
            <input required type="text" id="title" name="title" className="bg-secondary/50 border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="type" className="text-sm font-medium">Type *</label>
              <select required id="type" name="type" className="bg-secondary/50 border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                <option value="Media Production">Media Production</option>
                <option value="Event">Event</option>
                <option value="Consultant">Consultant</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="status" className="text-sm font-medium">Status *</label>
              <select required id="status" name="status" className="bg-secondary/50 border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                <option value="Pending">Pending</option>
                <option value="Active">Active</option>
                <option value="Shelved">Shelved</option>
                <option value="Done">Done</option>
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="clientId" className="text-sm font-medium">Client *</label>
            <select required id="clientId" name="clientId" className="bg-secondary/50 border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
              <option value="">Select a client...</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>{client.name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="description" className="text-sm font-medium">Description</label>
            <textarea id="description" name="description" rows={3} className="bg-secondary/50 border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"></textarea>
          </div>
          
          <div className="flex justify-end gap-3 mt-4">
            <button type="button" onClick={() => setIsOpen(false)} className="px-4 py-2 rounded-md font-medium text-sm hover:bg-secondary transition-colors text-muted-foreground">
              Cancel
            </button>
            <button disabled={loading} type="submit" className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50">
              {loading ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
