'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'

// URL field + upload icon. Uploads go to the separate "client-logos" bucket.
// Display priority: uploaded > url > placeholder.
export function LogoInput({
  url, upload, onChange,
}: {
  url: string
  upload: string
  onChange: (next: { url: string; upload: string }) => void
}) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const preview = upload || url

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) { setError('Images only.'); return }
    if (file.size > 5 * 1024 * 1024) { setError('Max 5MB.'); return }
    setError(null); setUploading(true)
    const supabase = createClient()
    const ext = file.name.split('.').pop()
    const path = `${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from('client-logos').upload(path, file, { upsert: true })
    if (upErr) { setError(upErr.message); setUploading(false); return }
    const { data } = supabase.storage.from('client-logos').getPublicUrl(path)
    onChange({ url, upload: data.publicUrl })
    setUploading(false)
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 shrink-0 rounded-full overflow-hidden bg-muted/30 border border-border flex items-center justify-center">
          {preview
            ? <img src={preview} alt="" className="w-full h-full object-contain p-0.5" />
            : <span className="text-muted-foreground/40 text-lg">?</span>}
        </div>
        <input
          type="url"
          value={url}
          onChange={e => onChange({ url: e.target.value, upload })}
          placeholder="https://logo-url…"
          className="flex-1 bg-secondary/50 border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          title="Upload custom file"
          className="shrink-0 w-9 h-9 rounded-md border border-border hover:bg-muted/50 transition-colors flex items-center justify-center text-muted-foreground"
        >
          {uploading
            ? <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 16V4M7 9l5-5 5 5M5 20h14" /></svg>}
        </button>
      </div>
      {upload && <button type="button" onClick={() => onChange({ url, upload: '' })} className="text-xs text-muted-foreground hover:text-destructive">Remove uploaded file</button>}
      {error && <p className="text-xs text-red-500">{error}</p>}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
    </div>
  )
}
