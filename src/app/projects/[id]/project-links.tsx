'use client'

import { useState } from 'react'
import { addUploadLink, deleteUploadLink, addFinalUrl, deleteFinalUrl } from './links-actions'

type UploadLink = { id: string; title: string; url: string }
type FinalUrl = { id: string; platform: string; url: string }

export function ProjectLinks({ 
  projectId, 
  uploadLinks, 
  finalUrls,
  canManage
}: { 
  projectId: string
  uploadLinks: UploadLink[]
  finalUrls: FinalUrl[]
  canManage: boolean
}) {
  const [isAddingUpload, setIsAddingUpload] = useState(false)
  const [isAddingFinal, setIsAddingFinal] = useState(false)

  async function handleAddUpload(formData: FormData) {
    await addUploadLink(projectId, formData)
    setIsAddingUpload(false)
  }

  async function handleAddFinal(formData: FormData) {
    await addFinalUrl(projectId, formData)
    setIsAddingFinal(false)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      {/* Upload Links */}
      <div className="glass p-6 rounded-2xl border-border/50">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Download Links</h3>
          {canManage && !isAddingUpload && (
            <button onClick={() => setIsAddingUpload(true)} className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-md font-medium hover:bg-primary/20 transition-colors">
              + Add Link
            </button>
          )}
        </div>
        
        {isAddingUpload && (
          <form action={handleAddUpload} className="mb-4 bg-secondary/30 p-3 rounded-xl border border-border/50 flex flex-col gap-2">
            <input required type="text" name="title" placeholder="Title (e.g. Google Drive)" className="text-sm bg-background border border-border rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/50" />
            <input required type="url" name="url" placeholder="https://..." className="text-sm bg-background border border-border rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/50" />
            <div className="flex justify-end gap-2 mt-1">
              <button type="button" onClick={() => setIsAddingUpload(false)} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
              <button type="submit" className="text-xs bg-primary text-primary-foreground px-3 py-1 rounded-md">Save</button>
            </div>
          </form>
        )}

        <div className="flex flex-col gap-2">
          {uploadLinks.map(link => (
            <div key={link.id} className="flex justify-between items-center bg-secondary/20 px-3 py-2 rounded-lg border border-border/30 group">
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-medium">{link.title}</span>
                <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline truncate">
                  {link.url}
                </a>
              </div>
              {canManage && (
                <button onClick={() => deleteUploadLink(projectId, link.id)} className="text-xs text-destructive hover:underline opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                  Delete
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Final Project URLs */}
      <div className="glass p-6 rounded-2xl border-border/50">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Final Project URLs</h3>
          {canManage && !isAddingFinal && (
            <button onClick={() => setIsAddingFinal(true)} className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-md font-medium hover:bg-primary/20 transition-colors">
              + Add URL
            </button>
          )}
        </div>
        
        {isAddingFinal && (
          <form action={handleAddFinal} className="mb-4 bg-secondary/30 p-3 rounded-xl border border-border/50 flex flex-col gap-2">
            <select required name="platform" className="text-sm bg-background border border-border rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/50">
              <option value="Instagram">Instagram</option>
              <option value="YouTube">YouTube</option>
              <option value="Facebook">Facebook</option>
              <option value="Custom">Custom URL</option>
            </select>
            <input required type="url" name="url" placeholder="https://..." className="text-sm bg-background border border-border rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/50" />
            <div className="flex justify-end gap-2 mt-1">
              <button type="button" onClick={() => setIsAddingFinal(false)} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
              <button type="submit" className="text-xs bg-primary text-primary-foreground px-3 py-1 rounded-md">Save</button>
            </div>
          </form>
        )}

        <div className="flex flex-col gap-2">
          {finalUrls.map(url => (
            <div key={url.id} className="flex justify-between items-center bg-secondary/20 px-3 py-2 rounded-lg border border-border/30 group">
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-medium">{url.platform}</span>
                <a href={url.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline truncate">
                  {url.url}
                </a>
              </div>
              {canManage && (
                <button onClick={() => deleteFinalUrl(projectId, url.id)} className="text-xs text-destructive hover:underline opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                  Delete
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
