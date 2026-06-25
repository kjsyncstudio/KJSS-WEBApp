'use client'

import { useState, useRef } from 'react'
import { batchAddProjects } from './actions'
import { createClient } from '@/utils/supabase/client'
import { CsvUploader } from './csv-uploader'

type Client = { id: string; name: string }

const DEFAULT_TYPES = ['Media Production', 'Event', 'Consultant', 'Other']
const DEFAULT_STATUSES = ['Active', 'Pending', 'Expedite', 'Completed']
const STATUS_COLORS: Record<string, string> = {
  Active: 'text-green-500',
  Expedite: 'text-amber-600',
  Completed: 'text-blue-500',
  Pending: 'text-zinc-400',
}

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

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4,
  may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8,
  sep: 9, sept: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
}

// Scan a title for a year+month and a known client name. Returns cleaned title + extracted fields.
function cleanTitle(title: string, clients: Client[]): { title: string; projectDate: string; clientId: string } {
  let t = title
  let projectDate = ''
  let clientId = ''

  // --- date: try "Month YYYY", "YYYY Month", "YYYY-MM", "MM/YYYY" ---
  const monthNames = Object.keys(MONTHS).join('|')
  const patterns: { re: RegExp; y: number; m: number }[] = [
    { re: new RegExp(`\\b(${monthNames})\\.?\\s*[,/-]?\\s*(\\d{4})\\b`, 'i'), y: 2, m: 1 },
    { re: new RegExp(`\\b(\\d{4})\\s*[,/-]?\\s*(${monthNames})\\b`, 'i'), y: 1, m: 2 },
    { re: /\b(\d{4})[-/.](\d{1,2})\b/, y: 1, m: 2 },
    { re: /\b(\d{1,2})[-/.](\d{4})\b/, y: 2, m: 1 },
  ]
  for (const p of patterns) {
    const match = t.match(p.re)
    if (!match) continue
    const yearStr = match[p.y]
    const monStr = match[p.m]
    const month = MONTHS[monStr.toLowerCase()] ?? parseInt(monStr, 10)
    const year = parseInt(yearStr, 10)
    if (month >= 1 && month <= 12 && year > 1900) {
      projectDate = `${year}-${String(month).padStart(2, '0')}-01`
      t = t.replace(match[0], ' ')
      break
    }
  }

  // --- client: longest matching client name found in title ---
  const found = clients
    .filter(c => c.name && new RegExp(`\\b${c.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(t))
    .sort((a, b) => b.name.length - a.name.length)[0]
  if (found) {
    clientId = found.id
    t = t.replace(new RegExp(`\\b${found.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i'), ' ')
  }

  // tidy leftover separators / whitespace
  t = t.replace(/[\s\-–—:|,/]+/g, ' ').replace(/^[\s\-–—:|,]+|[\s\-–—:|,]+$/g, '').replace(/\s{2,}/g, ' ').trim()

  return { title: t || title.trim(), projectDate, clientId }
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

export function BatchForm({ clients: initialClients, statuses, types }: { clients: Client[]; statuses?: string[]; types?: string[] }) {
  const TYPES = types?.length ? types : DEFAULT_TYPES
  const STATUSES = statuses?.length ? statuses : DEFAULT_STATUSES
  const [clients, setClients] = useState<Client[]>(initialClients)
  const [rows, setRows] = useState<Row[]>([emptyRow(0)])
  const [submitting, setSubmitting] = useState(false)
  const [saveError, setSaveError] = useState('')
  const fileRefs = useRef<Record<number, HTMLInputElement | null>>({})

  function addRow() {
    const last = rows[rows.length - 1]
    setRows(r => [...r, emptyRow(Date.now(), last)])
  }

  function removeRow(id: number) {
    setRows(r => r.filter(row => row.id !== id))
  }

  function updateRow(id: number, field: keyof Row, value: string) {
    setRows(r => r.map(row => row.id === id ? { ...row, [field]: value } : row))
  }

  function cleanupRow(id: number) {
    setRows(r => r.map(row => {
      if (row.id !== id) return row
      const c = cleanTitle(row.title, clients)
      return {
        ...row,
        title: c.title,
        projectDate: c.projectDate || row.projectDate,
        clientId: c.clientId || row.clientId,
      }
    }))
  }

  function handleThumb(id: number, file: File | null) {
    if (!file) return
    const url = URL.createObjectURL(file)
    setRows(r => r.map(row => row.id === id ? { ...row, thumbnail: url, thumbnailFile: file } : row))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    setSubmitting(true)
    setSaveError('')

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

    const fd = new FormData(form)
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
    // On success batchAddProjects redirects (throws), so this only returns on error
    const res = await batchAddProjects(fd)
    if (res?.error) setSaveError(res.error)
    setSubmitting(false)
  }

  function handleImport(imported: { title: string; clientId: string; type: string; status: string; description: string; projectDate: string }[], newClients: Client[] = []) {
    if (newClients.length > 0) setClients(prev => [...prev, ...newClients.filter(nc => !prev.find(c => c.id === nc.id))])
    const newRows = imported.map(r => ({
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
      <CsvUploader clients={clients} validTypes={TYPES} validStatuses={STATUSES} onImport={(rows, newClients) => handleImport(rows, newClients)} />
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

          {/* Actions */}
          <div className="flex flex-col items-end gap-2 self-start">
            <button
              type="button" onClick={() => removeRow(row.id)}
              className="text-muted-foreground hover:text-red-500 transition-colors text-lg leading-none"
              title="Remove row"
            >×</button>
            <button
              type="button" onClick={() => cleanupRow(row.id)}
              className="text-[11px] whitespace-nowrap border border-border rounded-md px-2 py-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              title="Extract date & client from title, strip them out"
            >Clean Up</button>
          </div>
        </div>
      ))}

      <div className="flex items-center justify-between pt-2">
        <button
          type="button" onClick={addRow}
          className="text-sm text-primary hover:underline"
        >
          + Add row {rows.length > 0 && `(${rows.length})`}
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

      {saveError && (
        <p className="text-sm text-red-500 text-right">
          {saveError === 'No valid rows.'
            ? 'No valid rows — every project needs a title, client, type and status. Pick a client (use Clean Up to auto-fill).'
            : saveError}
        </p>
      )}

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </form>
  )
}
