'use client'

import { useRef, useState } from 'react'
import { ErrorResolver, type ErrorRow, type ResolvedRow } from './error-resolver'

type Client = { id: string; name: string }

type ParsedRow = {
  title: string
  clientId: string
  rawClientName: string
  type: string
  status: string
  description: string
  projectDate: string
  errors: string[]
}

function parseCSV(text: string, clients: Client[], VALID_TYPES: string[], VALID_STATUSES: string[]): ParsedRow[] {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'))

  return lines.slice(1).filter(l => l.trim()).map(line => {
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

    return { title: get('title'), clientId: client?.id ?? '', rawClientName: clientName, type, status, description: get('description'), projectDate: get('project_date'), errors }
  })
}

function parseJSON(text: string, clients: Client[], VALID_TYPES: string[], VALID_STATUSES: string[]): ParsedRow[] {
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
    if (!VALID_TYPES.includes(type)) errors.push(`invalid type "${type}"`)
    if (!VALID_STATUSES.includes(status)) errors.push(`invalid status "${status}"`)
    return { title: item.title ?? '', clientId: client?.id ?? '', rawClientName: clientName, type, status, description: item.description ?? '', projectDate: item.project_date ?? '', errors }
  })
}

interface CsvUploaderProps {
  clients: Client[]
  validTypes: string[]
  validStatuses: string[]
  onImport: (rows: ResolvedRow[], newClients: Client[]) => void
}

export function CsvUploader({ clients: initialClients, validTypes, validStatuses, onImport }: CsvUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [validRows, setValidRows] = useState<ResolvedRow[]>([])
  const [errorRows, setErrorRows] = useState<ErrorRow[]>([])
  const [clients, setClients] = useState<Client[]>(initialClients)
  const [parseError, setParseError] = useState<string | null>(null)
  const [resolving, setResolving] = useState(false)
  const [fileName, setFileName] = useState('')

  async function handleFile(file: File) {
    setParseError(null)
    setValidRows([]); setErrorRows([])
    setFileName(file.name)
    const text = await file.text()
    try {
      const rows = file.name.endsWith('.json') ? parseJSON(text, clients, validTypes, validStatuses) : parseCSV(text, clients, validTypes, validStatuses)
      const valid = rows.filter(r => r.errors.length === 0).map(({ errors: _, rawClientName: __, ...r }) => r)
      const errs = rows.filter(r => r.errors.length > 0) as ErrorRow[]
      setValidRows(valid)
      setErrorRows(errs)
      if (errs.length > 0) setResolving(true)
      else if (valid.length > 0) handleFinish(valid, [], [])
    } catch (e) {
      setParseError(e instanceof Error ? e.message : 'Parse error')
    }
  }

  function handleFinish(valid: ResolvedRow[], fromResolver: ResolvedRow[], newClients: Client[]) {
    const all = [...valid, ...fromResolver]
    const merged = [...clients, ...newClients]
    setClients(merged)
    setResolving(false)
    setErrorRows([])
    setValidRows([])
    setFileName('')
    onImport(all, newClients)
  }

  return (
    <>
      {resolving && errorRows.length > 0 && (
        <ErrorResolver
          errorRows={errorRows}
          clients={clients}
          validStatuses={validStatuses}
          onResolved={(fromResolver, newClients) => handleFinish(validRows, fromResolver, newClients)}
          onCancel={() => { setResolving(false); setErrorRows([]); setValidRows([]) }}
        />
      )}

      <div className="glass border border-border/50 rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-sm">Import from CSV / JSON</h3>
            {fileName && <p className="text-xs text-muted-foreground mt-0.5">{fileName}</p>}
          </div>
          <button type="button" onClick={() => inputRef.current?.click()}
            className="text-xs bg-secondary border border-border px-3 py-1.5 rounded-md hover:bg-muted/50 transition-colors">
            Choose file
          </button>
          <input ref={inputRef} type="file" accept=".csv,.json" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }} />
        </div>

        {parseError && <p className="text-xs text-red-500">{parseError}</p>}

        <p className="text-xs text-muted-foreground">
          CSV columns: <code className="bg-muted px-1 rounded">title, client_name, type, status, project_date, description</code>
        </p>
      </div>
    </>
  )
}
