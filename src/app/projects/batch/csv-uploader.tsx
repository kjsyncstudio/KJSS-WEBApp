'use client'

import { useRef, useState } from 'react'

type Client = { id: string; name: string }

type ParsedRow = {
  title: string
  clientId: string
  type: string
  status: string
  description: string
  projectDate: string
  error?: string
}

const VALID_TYPES = ['Media Production', 'Event', 'Consultant', 'Other']
const VALID_STATUSES = ['Active', 'Pending', 'Shelved', 'Done']

function parseCSV(text: string, clients: Client[]): ParsedRow[] {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'))

  return lines.slice(1).map(line => {
    // handle quoted fields
    const cols: string[] = []
    let cur = ''; let inQ = false
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ }
      else if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = '' }
      else cur += ch
    }
    cols.push(cur.trim())

    const get = (key: string) => cols[headers.indexOf(key)]?.trim() ?? ''

    const clientName = get('client_name')
    const client = clients.find(c => c.name.toLowerCase() === clientName.toLowerCase())
    const type = get('type') || 'Other'
    const status = get('status') || 'Pending'
    const errors: string[] = []
    if (!get('title')) errors.push('missing title')
    if (!client) errors.push(`client "${clientName}" not found`)
    if (!VALID_TYPES.includes(type)) errors.push(`invalid type "${type}"`)
    if (!VALID_STATUSES.includes(status)) errors.push(`invalid status "${status}"`)

    return {
      title: get('title'),
      clientId: client?.id ?? '',
      type,
      status,
      description: get('description'),
      projectDate: get('project_date'),
      error: errors.length ? errors.join('; ') : undefined,
    }
  }).filter(r => r.title || r.clientId)
}

function parseJSON(text: string, clients: Client[]): ParsedRow[] {
  const arr = JSON.parse(text)
  if (!Array.isArray(arr)) throw new Error('JSON must be an array')
  return arr.map((item: Record<string, string>) => {
    const clientName = item.client_name ?? ''
    const client = clients.find(c => c.name.toLowerCase() === clientName.toLowerCase())
    const type = item.type || 'Other'
    const status = item.status || 'Pending'
    const errors: string[] = []
    if (!item.title) errors.push('missing title')
    if (!client) errors.push(`client "${clientName}" not found`)
    if (!VALID_TYPES.includes(type)) errors.push(`invalid type`)
    if (!VALID_STATUSES.includes(status)) errors.push(`invalid status`)
    return {
      title: item.title ?? '',
      clientId: client?.id ?? '',
      type,
      status,
      description: item.description ?? '',
      projectDate: item.project_date ?? '',
      error: errors.length ? errors.join('; ') : undefined,
    }
  })
}

interface CsvUploaderProps {
  clients: Client[]
  onImport: (rows: ParsedRow[]) => void
}

export function CsvUploader({ clients, onImport }: CsvUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<ParsedRow[] | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)

  async function handleFile(file: File) {
    setParseError(null)
    const text = await file.text()
    try {
      const rows = file.name.endsWith('.json') ? parseJSON(text, clients) : parseCSV(text, clients)
      setPreview(rows)
    } catch (e) {
      setParseError(e instanceof Error ? e.message : 'Parse error')
    }
  }

  const validRows = preview?.filter(r => !r.error) ?? []
  const errorRows = preview?.filter(r => r.error) ?? []

  return (
    <div className="glass border border-border/50 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Import from CSV / JSON</h3>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="text-xs bg-secondary border border-border px-3 py-1.5 rounded-md hover:bg-muted/50 transition-colors"
        >
          Choose file
        </button>
        <input ref={inputRef} type="file" accept=".csv,.json" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }} />
      </div>

      {parseError && <p className="text-xs text-red-500">{parseError}</p>}

      {preview && (
        <div className="space-y-3">
          <div className="text-xs text-muted-foreground">
            <span className="text-green-500 font-medium">{validRows.length} valid</span>
            {errorRows.length > 0 && <span className="text-red-500 font-medium ml-3">{errorRows.length} with errors (will be skipped)</span>}
          </div>

          {errorRows.length > 0 && (
            <div className="space-y-1">
              {errorRows.map((r, i) => (
                <p key={i} className="text-xs text-red-400">Row "{r.title || '?'}": {r.error}</p>
              ))}
            </div>
          )}

          <div className="max-h-48 overflow-y-auto divide-y divide-border/30 rounded-lg border border-border/50">
            {validRows.map((r, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2 text-xs">
                <span className="font-medium flex-1 truncate">{r.title}</span>
                <span className="text-muted-foreground">{clients.find(c => c.id === r.clientId)?.name}</span>
                <span className="text-muted-foreground">{r.type}</span>
                <span className="text-muted-foreground">{r.status}</span>
              </div>
            ))}
          </div>

          {validRows.length > 0 && (
            <button
              type="button"
              onClick={() => { onImport(validRows); setPreview(null) }}
              className="w-full py-2 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              Add {validRows.length} rows to form
            </button>
          )}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        CSV columns: <code className="bg-muted px-1 rounded">title, client_name, type, status, project_date, description</code>
      </p>
    </div>
  )
}
