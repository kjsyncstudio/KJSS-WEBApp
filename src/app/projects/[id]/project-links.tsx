'use client'

import { useState, useTransition } from 'react'
import { addUploadLink, updateUploadLink, deleteUploadLink, addFinalUrl, deleteFinalUrl } from './links-actions'

type UploadLink = { id: string; title: string; url: string }
type FinalUrl = { id: string; platform: string; url: string }

function providerName(url: string): string {
  try {
    const h = new URL(url).hostname.replace(/^www\./, '')
    if (/drive\.google|docs\.google/.test(h)) return 'drive'
    if (/dropbox/.test(h)) return 'dropbox'
    if (/youtube|youtu\.be/.test(h)) return 'youtube'
    if (/instagram/.test(h)) return 'instagram'
    if (/facebook|fb\./.test(h)) return 'facebook'
    if (/tiktok/.test(h)) return 'tiktok'
    if (/vimeo/.test(h)) return 'vimeo'
    return 'link'
  } catch { return 'link' }
}

// Small colored glyph per provider
function LinkIcon({ url }: { url: string }) {
  const p = providerName(url)
  const base = 'w-7 h-7 shrink-0 rounded-md flex items-center justify-center text-[10px] font-bold'
  if (p === 'drive') return <span className={`${base} bg-green-500/15 text-green-600`}>▲</span>
  if (p === 'dropbox') return <span className={`${base} bg-blue-500/15 text-blue-600`}>▽</span>
  if (p === 'youtube') return <span className={`${base} bg-red-500/15 text-red-600`}>▶</span>
  if (p === 'instagram') return <span className={`${base} bg-pink-500/15 text-pink-600`}>◎</span>
  if (p === 'facebook') return <span className={`${base} bg-blue-600/15 text-blue-700`}>f</span>
  if (p === 'tiktok') return <span className={`${base} bg-foreground/10 text-foreground`}>♪</span>
  if (p === 'vimeo') return <span className={`${base} bg-sky-500/15 text-sky-600`}>v</span>
  return (
    <span className={`${base} bg-muted text-muted-foreground`}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" /><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" /></svg>
    </span>
  )
}

export function ProjectLinks({ projectId, uploadLinks, finalUrls, canManage }: {
  projectId: string
  uploadLinks: UploadLink[]
  finalUrls: FinalUrl[]
  canManage: boolean
}) {
  const [, start] = useTransition()

  // Download links
  const [addingUrl, setAddingUrl] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editUrl, setEditUrl] = useState('')
  const [busy, setBusy] = useState(false)

  // Final urls
  const [isAddingFinal, setIsAddingFinal] = useState(false)
  const [finalPlatform, setFinalPlatform] = useState('Instagram')
  const [finalUrl, setFinalUrl] = useState('')

  function addLink() {
    if (!addingUrl.trim()) return
    setBusy(true)
    start(async () => { await addUploadLink(projectId, addingUrl.trim()); setAddingUrl(''); setShowAdd(false); setBusy(false) })
  }
  function saveEdit(id: string) {
    setBusy(true)
    start(async () => { await updateUploadLink(projectId, id, editUrl.trim()); setEditingId(null); setBusy(false) })
  }
  function removeLink(link: UploadLink) {
    if (!confirm(`Delete this link?\n${link.title}`)) return
    start(async () => { await deleteUploadLink(projectId, link.id) })
  }
  function addFinal() {
    if (!finalUrl.trim()) return
    start(async () => { await addFinalUrl(projectId, finalPlatform, finalUrl.trim()); setFinalUrl(''); setIsAddingFinal(false) })
  }
  function removeFinal(u: FinalUrl) {
    if (!confirm(`Delete this URL?\n${u.platform}`)) return
    start(async () => { await deleteFinalUrl(projectId, u.id) })
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      {/* Download Links */}
      <div className="glass p-6 rounded-2xl border-border/50">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Download Links</h3>
          {canManage && !showAdd && (
            <button onClick={() => setShowAdd(true)} className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-md font-medium hover:bg-primary/20 transition-colors">+ Add Link</button>
          )}
        </div>

        {showAdd && (
          <div className="mb-4 bg-secondary/30 p-3 rounded-xl border border-border/50 flex flex-col gap-2">
            <input autoFocus type="url" value={addingUrl} onChange={e => setAddingUrl(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addLink() }}
              placeholder="Paste a link (Google Drive, Dropbox, …)"
              className="text-sm bg-background border border-border rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/50" />
            <p className="text-[11px] text-muted-foreground">Title is fetched automatically from the link.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => { setShowAdd(false); setAddingUrl('') }} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
              <button onClick={addLink} disabled={busy || !addingUrl.trim()} className="text-xs bg-primary text-primary-foreground px-3 py-1 rounded-md disabled:opacity-50">{busy ? 'Adding…' : 'Add'}</button>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {uploadLinks.length === 0 && !showAdd && <p className="text-xs text-muted-foreground">No links yet.</p>}
          {uploadLinks.map(link => (
            <div key={link.id} className="flex items-center gap-2 bg-secondary/20 px-3 py-2 rounded-lg border border-border/30 group">
              <LinkIcon url={link.url} />
              {editingId === link.id ? (
                <div className="flex-1 flex items-center gap-2">
                  <input autoFocus type="url" value={editUrl} onChange={e => setEditUrl(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveEdit(link.id); if (e.key === 'Escape') setEditingId(null) }}
                    className="flex-1 text-xs bg-background border border-border rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary/50" />
                  <button onClick={() => saveEdit(link.id)} className="text-xs text-primary font-medium">Save</button>
                  <button onClick={() => setEditingId(null)} className="text-xs text-muted-foreground">✕</button>
                </div>
              ) : (
                <>
                  <div className="flex flex-col overflow-hidden flex-1">
                    <span className="text-sm font-medium truncate">{link.title}</span>
                    <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline truncate">{link.url}</a>
                  </div>
                  {canManage && (
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button onClick={() => { setEditingId(link.id); setEditUrl(link.url) }} className="text-xs text-muted-foreground hover:text-foreground">Edit</button>
                      <button onClick={() => removeLink(link)} className="text-xs text-destructive hover:underline">Delete</button>
                    </div>
                  )}
                </>
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
            <button onClick={() => setIsAddingFinal(true)} className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-md font-medium hover:bg-primary/20 transition-colors">+ Add URL</button>
          )}
        </div>

        {isAddingFinal && (
          <div className="mb-4 bg-secondary/30 p-3 rounded-xl border border-border/50 flex flex-col gap-2">
            <select value={finalPlatform} onChange={e => setFinalPlatform(e.target.value)} className="text-sm bg-background border border-border rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/50">
              <option>Instagram</option><option>YouTube</option><option>Facebook</option><option>TikTok</option><option>Vimeo</option><option>Custom</option>
            </select>
            <input type="url" value={finalUrl} onChange={e => setFinalUrl(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addFinal() }}
              placeholder="https://…" className="text-sm bg-background border border-border rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/50" />
            <div className="flex justify-end gap-2">
              <button onClick={() => { setIsAddingFinal(false); setFinalUrl('') }} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
              <button onClick={addFinal} disabled={!finalUrl.trim()} className="text-xs bg-primary text-primary-foreground px-3 py-1 rounded-md disabled:opacity-50">Add</button>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {finalUrls.length === 0 && !isAddingFinal && <p className="text-xs text-muted-foreground">No URLs yet.</p>}
          {finalUrls.map(u => (
            <div key={u.id} className="flex items-center gap-2 bg-secondary/20 px-3 py-2 rounded-lg border border-border/30 group">
              <LinkIcon url={u.url} />
              <div className="flex flex-col overflow-hidden flex-1">
                <span className="text-sm font-medium">{u.platform}</span>
                <a href={u.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline truncate">{u.url}</a>
              </div>
              {canManage && (
                <button onClick={() => removeFinal(u)} className="text-xs text-destructive hover:underline opacity-0 group-hover:opacity-100 transition-opacity shrink-0">Delete</button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
