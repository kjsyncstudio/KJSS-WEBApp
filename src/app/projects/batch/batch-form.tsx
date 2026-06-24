'use client'

import { useState, useRef } from 'react'
import { batchAddProjects } from './actions'
import { createClient } from '@/utils/supabase/client'
import { CsvUploader } from './csv-uploader'

type Client = { id: string; name: string }

const TYPES = ['Media Production', 'Event', 'Consultant', 'Other']
const STATUSES = ['Pending', 'Active', 'Shelved', 'Done']
const STATUS_COLORS: Record<string, string> = {
  Active: 'text-green-500',
  Done: 'text-blue-500',
  Shelved: 'text-orange-500',
  Pending: 'text-zinc-400',
}

const MAX_ROWS = 20

type Row = {
  id: number
  title: string
  clientId: string
  type: string
  status: string
  description: string
  projectDate: string
  thumbnail: string | null   // local object URL for preview
  thumbnailFile: File | null // actual file to upload
}

function emptyRow(id: number, base?: Row): Row {
  return {
    id,
    title: base?.title ?? '',
    clientId: base?.clientId ?? '',
    type: base?.type ?? 'Media Production',
    status: base?.status ?? 'Pending',
    description: base?.description ?? '',
    projectDate: base?.projectDate ?? '',
    thumbnail: null,
    thumbnailFile: null,
  }
}

export function BatchForm({ clients: initialClients }: { clients: Client[] }) {
  const [clients, setClients] = useState<Client[]>(initialClients)
  const [rows, setRows] = useState<Row[]>([emptyRow(0)])
  const [submitting, setSubmitting] = useState(false)
  const fileRefs = useRef<Record<number, HTMLInputElement | null>>({})

  function addRow() {
    if (rows.length >= MAX_ROWS) return
    const last = rows[rows.length - 1]
    setRows(r => [...r, emptyRow(Date.now(), last)])
  }

  function removeRow(id: number) {
    setRows(r => r.filter(row => row.id !== id))
  }

  function updateRow(id: number, field: keyof Row, value: string) {
    setRows(r => r.map(row => row.id === id ? { ...row, [field]: value } : row))
  }

  function handleThumb(id: number, file: File | null) {
    if (!file) return
    const url = URL.createObjectURL(file)
    setRows(r => r.map(row => row.id === id ? { ...row, thumbnail: url, thumbnailFile: file } : row))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)

    // Upload all thumbnail files first
    const supabase = createClient()
    const thumbnailUrls: Record<number, string> = {}
    await Promise.all(rows.map(async (row, i) => {
      if (!row.thumbnailFile) return
      const ext = row.thumbnailFile.name.split('.').pop()
      const path = `project-thumbnails/${Date.now()}_${i}.${ext}`
      const { error } = await supabase.storage.from('images').upload(path, row.thumbnailFile, { upsert: true })
      if (!error) {
        const { data } = supabase.storage.from('images').getPublicUrl(path)
        thumbnailUrls[i] = data.publicUrl
      }
    }))

    const fd = new FormData(e.currentTarget)
    fd.set('count', String(rows.length))
    rows.forEach((row, i) => {
      fd.set(`title_${i}`, row.title)
      fd.set(`clientId_${i}`, row.clientId)
      fd.set(`type_${i}`, row.type)
      fd.set(`status_${i}`, row.status)
      fd.set(`description_${i}`, row.description)
      fd.set(`projectDate_${i}`, row.projectDate)
      fd.set(`thumbnailUrl_${i}`, thumbnailUrls[i] ?? '')
    })
    await batchAddProjects(fd)
    setSubmitting(false)
  }

  function handleImport(imported: { title: string; clientId: string; type: string; status: string; description: string; projectDate: string }[], newClients: Client[] = []) {
    if (newClients.length > 0) setClients(prev => [...prev, ...newClients.filter(nc => !prev.find(c => c.id === nc.id))])
    const newRows = imported.slice(0, MAX_ROWS - rows.length).map(r => ({
      id: Date.now() + Math.random(),
      title: r.title,
      clientId: r.clientId,
      type: r.type,
      status: r.status,
      description: r.description,
      projectDate: r.projectDate,
      thumbnail: null,
      thumbnailFile: null,
    }))
    setRows(r => [...r, ...newRows])
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <CsvUploader clients={clients} onImport={(rows, newClients) => handleImport(rows, newClients)} />
      {rows.map((row, i) => (
        <div
          key={row.id}
          className="glass border border-border/50 rounded-xl flex gap-3 p-3 items-stretch"
          style={{ animation: `slideDown 0.3s ease both`, animationDelay: `${i * 60}ms` }}
        >
          {/* Thumbnail */}
          <button
            type="button"
            onClick={() => fileRefs.current[row.id]?.click()}
            className="w-16 h-16 shrink-0 rounded-lg border-2 border-dashed border-border hover:border-primary/60 transition-colors overflow-hidden bg-muted/30 flex items-center justify-center self-center"
          >
            {row.thumbnail
              ? <img src={row.thumbnail} alt="" className="w-full h-full object-cover" />
              : <span className="text-2xl text-muted-foreground/40">+</span>
            }
          </button>
          <input
            ref={el => { fileRefs.current[row.id] = el }}
            type="file" accept="image/*" className="hidden"
            onChange={e => handleThumb(row.id, e.target.files?.[0] ?? null)}
          />

          {/* Title + meta */}
          <div className="flex flex-col gap-1.5 flex-1 min-w-0 justify-center">
            <input
              placeholder="Project title *"
              required
              value={row.title}
              onChange={e => updateRow(row.id, 'title', e.target.value)}
              className="bg-background/50 border border-border rounded-md px-2 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 w-full"
            />
            <div className="flex gap-1.5">
              <select
                value={row.clientId} required
                onChange={e => updateRow(row.id, 'clientId', e.target.value)}
                className="bg-background/50 border border-border rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary/50 flex-1 min-w-0"
              >
                <option value="">Client *</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select
                value={row.type}
                onChange={e => updateRow(row.id, 'type', e.target.value)}
                className="bg-background/50 border border-border rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary/50 flex-1 min-w-0"
              >
                {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="flex gap-1.5">
              <select
                value={row.status}
                onChange={e => updateRow(row.id, 'status', e.target.value)}
                className={`bg-background/50 border border-border rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary/50 font-medium flex-1 min-w-0 ${STATUS_COLORS[row.status]}`}
              >
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <input
                type="date"
                value={row.projectDate}
                onChange={e => updateRow(row.id, 'projectDate', e.target.value)}
                className="bg-background/50 border border-border rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary/50 flex-1 min-w-0"
              />
            </div>
          </div>

          {/* Description — half width */}
          <textarea
            placeholder="Description (optional)"
            value={row.description}
            onChange={e => updateRow(row.id, 'description', e.target.value)}
            rows={3}
            className="w-1/2 bg-background/50 border border-border rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
          />

          {/* Remove */}
          <button
            type="button" onClick={() => removeRow(row.id)}
            className="text-muted-foreground hover:text-red-500 transition-colors self-start text-lg leading-none mt-0.5"
            title="Remove row"
          >×</button>
        </div>
      ))}

      <div className="flex items-center justify-between pt-2">
        <button
          type="button" onClick={addRow}
          disabled={rows.length >= MAX_ROWS}
          className="text-sm text-primary hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
        >
          + Add row {rows.length > 0 && `(${rows.length}/${MAX_ROWS})`}
        </button>
        <div className="flex gap-3">
          <a href="/projects" className="px-4 py-2 rounded-md text-sm font-medium border border-border hover:bg-muted/50 transition-colors">
            Cancel
          </a>
          <button
            type="submit" disabled={submitting || rows.length === 0}
            className="bg-primary text-primary-foreground px-6 py-2 rounded-md text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {submitting ? 'Saving…' : `Save ${rows.length} Project${rows.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </form>
  )
}
