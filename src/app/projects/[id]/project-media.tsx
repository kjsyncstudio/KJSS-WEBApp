'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { compressImage } from '@/utils/compress-image'
import { addMedia, deleteMedia, reorderMedia } from './media-actions'

type Media = { id: string; kind: 'image' | 'video'; url: string; sort: number }

function youtubeId(u: string) { const m = u.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/); return m?.[1] }
function vimeoId(u: string) { const m = u.match(/vimeo\.com\/(\d+)/); return m?.[1] }
function embedSrc(u: string) {
  const yt = youtubeId(u); if (yt) return `https://www.youtube.com/embed/${yt}`
  const vm = vimeoId(u); if (vm) return `https://player.vimeo.com/video/${vm}`
  return null
}
function videoThumb(u: string) { const yt = youtubeId(u); return yt ? `https://img.youtube.com/vi/${yt}/hqdefault.jpg` : null }

export function ProjectMedia({ projectId, media, canManage }: { projectId: string; media: Media[]; canManage: boolean }) {
  const router = useRouter()
  const [items, setItems] = useState<Media[]>(media)
  const [lightbox, setLightbox] = useState<number | null>(null)
  const [uploading, setUploading] = useState(false)
  const [addingVideo, setAddingVideo] = useState(false)
  const [videoUrl, setVideoUrl] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const dragFrom = useRef<number | null>(null)

  async function uploadFiles(files: FileList | File[]) {
    setUploading(true)
    const supabase = createClient()
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue
      const blob = await compressImage(file)
      const path = `project-media/${projectId}/${Date.now()}-${Math.random().toString(36).slice(2, 6)}.webp`
      const { error } = await supabase.storage.from('images').upload(path, blob, { upsert: true, contentType: blob.type })
      if (!error) {
        const { data } = supabase.storage.from('images').getPublicUrl(path)
        await addMedia(projectId, 'image', data.publicUrl)
      }
    }
    setUploading(false)
    router.refresh()
  }

  async function addVideoLink() {
    if (!videoUrl.trim()) return
    await addMedia(projectId, 'video', videoUrl.trim())
    setVideoUrl(''); setAddingVideo(false); router.refresh()
  }
  async function remove(id: string) {
    if (!confirm('Remove this item?')) return
    setItems(prev => prev.filter(m => m.id !== id))
    await deleteMedia(projectId, id); router.refresh()
  }

  function onDrop(e: React.DragEvent, toIdx: number) {
    e.preventDefault()
    const from = dragFrom.current
    dragFrom.current = null
    if (from === null || from === toIdx) return
    const next = [...items]
    const [moved] = next.splice(from, 1)
    next.splice(toIdx, 0, moved)
    setItems(next)
    reorderMedia(projectId, next.map(m => m.id)).then(() => router.refresh())
  }

  function onZoneDrop(e: React.DragEvent) {
    e.preventDefault()
    if (e.dataTransfer.files?.length) uploadFiles(e.dataTransfer.files)
  }

  return (
    <div className="glass p-6 rounded-2xl border-border/50 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Images <span className="text-xs font-normal text-muted-foreground ml-1">first image is the cover</span></h3>
        {canManage && (
          <div className="flex gap-2">
            <button onClick={() => fileRef.current?.click()} className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-md font-medium hover:bg-primary/20 transition-colors">+ Image</button>
            <button onClick={() => setAddingVideo(v => !v)} className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-md font-medium hover:bg-primary/20 transition-colors">+ Video link</button>
          </div>
        )}
      </div>

      {canManage && addingVideo && (
        <div className="flex gap-2 mb-4">
          <input autoFocus type="url" value={videoUrl} onChange={e => setVideoUrl(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addVideoLink() }}
            placeholder="YouTube / Vimeo / Instagram / TikTok link" className="flex-1 text-sm bg-background border border-border rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/50" />
          <button onClick={addVideoLink} className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-md">Add</button>
        </div>
      )}

      {canManage && (
        <div onDragOver={e => e.preventDefault()} onDrop={onZoneDrop}
          onClick={() => fileRef.current?.click()}
          className="mb-4 border-2 border-dashed border-border rounded-xl py-6 text-center text-sm text-muted-foreground hover:border-primary/50 cursor-pointer transition-colors">
          {uploading ? 'Uploading…' : 'Drag images here, or click to upload (auto-compressed)'}
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={e => { if (e.target.files?.length) uploadFiles(e.target.files); e.target.value = '' }} />

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No images yet.</p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
          {items.map((m, i) => {
            const thumb = m.kind === 'image' ? m.url : videoThumb(m.url)
            return (
              <div key={m.id}
                draggable={canManage}
                onDragStart={() => { dragFrom.current = i }}
                onDragOver={e => e.preventDefault()}
                onDrop={e => onDrop(e, i)}
                onClick={() => setLightbox(i)}
                className="relative aspect-square rounded-lg overflow-hidden bg-muted/30 group cursor-pointer border border-border/40">
                {thumb ? <img src={thumb} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-muted-foreground/50 text-xs px-1 text-center">video</div>}
                {m.kind === 'video' && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center">▶</span>
                  </div>
                )}
                {i === 0 && m.kind === 'image' && <span className="absolute top-1 left-1 text-[9px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded">cover</span>}
                {canManage && (
                  <button onClick={e => { e.stopPropagation(); remove(m.id) }}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">✕</button>
                )}
              </div>
            )
          })}
        </div>
      )}
      {canManage && items.length > 1 && <p className="text-[11px] text-muted-foreground mt-2">Drag to reorder · first image is the cover.</p>}

      {/* Lightbox */}
      {lightbox !== null && items[lightbox] && (
        <div onClick={() => setLightbox(null)} className="fixed inset-0 z-[80] bg-black/85 flex items-center justify-center p-4">
          <button className="absolute top-4 right-4 text-white text-2xl">✕</button>
          {(() => {
            const m = items[lightbox]
            if (m.kind === 'image') return <img src={m.url} alt="" className="max-w-full max-h-full object-contain rounded" onClick={e => e.stopPropagation()} />
            const src = embedSrc(m.url)
            if (src) return <iframe src={src} className="w-full max-w-3xl aspect-video rounded" allow="autoplay; fullscreen" allowFullScreen onClick={e => e.stopPropagation()} />
            return <a href={m.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="bg-white text-black px-5 py-3 rounded-md font-medium">Open video ↗</a>
          })()}
        </div>
      )}
    </div>
  )
}
