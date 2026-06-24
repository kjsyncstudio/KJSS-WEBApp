'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'

interface ImageUploaderProps {
  bucket?: string
  folder?: string
  currentUrl?: string | null
  onUploaded: (url: string) => void
  shape?: 'square' | 'wide'
  placeholder?: string
}

export function ImageUploader({
  bucket = 'images',
  folder = 'uploads',
  currentUrl,
  onUploaded,
  shape = 'square',
  placeholder = 'Upload image',
}: ImageUploaderProps) {
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) { setError('Images only.'); return }
    if (file.size > 5 * 1024 * 1024) { setError('Max 5MB.'); return }
    setError(null)
    setUploading(true)
    setPreview(URL.createObjectURL(file))

    const supabase = createClient()
    const ext = file.name.split('.').pop()
    const path = `${folder}/${Date.now()}.${ext}`

    const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, { upsert: true })
    if (upErr) { setError(upErr.message); setUploading(false); return }

    const { data } = supabase.storage.from(bucket).getPublicUrl(path)
    onUploaded(data.publicUrl)
    setUploading(false)
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={`relative overflow-hidden rounded-xl border-2 border-dashed border-border hover:border-primary/60 transition-colors bg-muted/20 flex items-center justify-center group
          ${shape === 'wide' ? 'w-full h-32' : 'w-24 h-24'}`}
      >
        {preview ? (
          <>
            <img src={preview} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-white text-xs font-medium">Change</span>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-1 text-muted-foreground/60 group-hover:text-muted-foreground transition-colors px-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="m21 15-5-5L5 21" />
            </svg>
            <span className="text-xs text-center leading-tight">{uploading ? 'Uploading…' : placeholder}</span>
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
    </div>
  )
}
