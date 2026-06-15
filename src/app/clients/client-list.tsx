'use client'

import { deleteClient, updateClient } from './actions'
import { useState, useEffect } from 'react'

type Client = {
  id: string
  name: string
  industry: string
  year_start: number
  year_end: number | null
  logo_url: string | null
}

export function ClientList({ clients, canManage }: { clients: Client[], canManage: boolean }) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  
  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, clientId: string } | null>(null)
  
  // Edit Modal State
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [isEditing, setIsEditing] = useState(false)

  // Close context menu on document click
  useEffect(() => {
    const handleClick = () => setContextMenu(null)
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this client?')) return
    setDeletingId(id)
    await deleteClient(id)
    setDeletingId(null)
  }

  function handleContextMenu(e: React.MouseEvent, clientId: string) {
    if (!canManage) return
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, clientId })
  }

  async function handleEditSubmit(formData: FormData) {
    if (!editingClient) return
    setIsEditing(true)
    await updateClient(editingClient.id, formData)
    setIsEditing(false)
    setEditingClient(null)
  }

  if (clients.length === 0) {
    return (
      <div className="glass p-12 rounded-2xl border-border/50 text-center flex flex-col items-center justify-center">
        <h3 className="text-xl font-medium text-muted-foreground mb-2">No Clients Yet</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          You haven't added any clients to your studio yet. {canManage && 'Click the Add Client button to get started.'}
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {clients.map((client) => (
          <div 
            key={client.id} 
            onContextMenu={(e) => handleContextMenu(e, client.id)}
            className="glass p-6 rounded-2xl border-border/50 flex flex-col group relative overflow-hidden transition-all hover:shadow-xl hover:border-primary/20 cursor-context-menu"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                {client.logo_url ? (
                  <img src={client.logo_url} alt={client.name} className="w-12 h-12 rounded-full object-cover bg-secondary" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-primary font-bold text-lg">
                    {client.name.charAt(0)}
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-lg leading-tight">{client.name}</h3>
                  <span className="text-sm text-muted-foreground">{client.industry}</span>
                </div>
              </div>
            </div>
            
            <div className="mt-auto pt-4 border-t border-border/50 flex items-center justify-between">
              <span className="text-xs font-medium bg-secondary/50 px-2 py-1 rounded-md text-muted-foreground">
                {client.year_start} - {client.year_end || 'Present'}
              </span>
              
              {canManage && (
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDelete(client.id) }}
                  disabled={deletingId === client.id}
                  className="text-xs text-destructive hover:underline opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                >
                  {deletingId === client.id ? 'Deleting...' : 'Delete'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div 
          className="fixed z-50 bg-card border border-border rounded-md shadow-xl py-1 min-w-[150px] animate-in fade-in zoom-in-95"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button 
            className="w-full text-left px-4 py-2 text-sm hover:bg-secondary transition-colors"
            onClick={() => {
              setEditingClient(clients.find(c => c.id === contextMenu.clientId) || null)
              setContextMenu(null)
            }}
          >
            Edit Client
          </button>
          <button 
            className="w-full text-left px-4 py-2 text-sm text-destructive hover:bg-secondary transition-colors"
            onClick={() => {
              handleDelete(contextMenu.clientId)
              setContextMenu(null)
            }}
          >
            Delete
          </button>
        </div>
      )}

      {/* Edit Modal */}
      {editingClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="glass p-6 rounded-2xl border-border/50 w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">Edit Client</h3>
              <button onClick={() => setEditingClient(null)} className="text-muted-foreground hover:text-foreground">
                ✕
              </button>
            </div>
            <form action={handleEditSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label htmlFor="edit-name" className="text-sm font-medium">Name *</label>
                <input required type="text" id="edit-name" name="name" defaultValue={editingClient.name} className="bg-secondary/50 border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="edit-industry" className="text-sm font-medium">Industry *</label>
                <input required type="text" id="edit-industry" name="industry" defaultValue={editingClient.industry} className="bg-secondary/50 border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label htmlFor="edit-yearStart" className="text-sm font-medium">Year Start *</label>
                  <input required type="number" id="edit-yearStart" name="yearStart" defaultValue={editingClient.year_start} className="bg-secondary/50 border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor="edit-yearEnd" className="text-sm font-medium">Year End</label>
                  <input type="number" id="edit-yearEnd" name="yearEnd" defaultValue={editingClient.year_end || ''} placeholder="Present" className="bg-secondary/50 border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="edit-logoUrl" className="text-sm font-medium">Logo URL</label>
                <input type="url" id="edit-logoUrl" name="logoUrl" defaultValue={editingClient.logo_url || ''} placeholder="https://..." className="bg-secondary/50 border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              
              <div className="flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setEditingClient(null)} className="px-4 py-2 rounded-md font-medium text-sm hover:bg-secondary transition-colors text-muted-foreground">
                  Cancel
                </button>
                <button disabled={isEditing} type="submit" className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50">
                  {isEditing ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
