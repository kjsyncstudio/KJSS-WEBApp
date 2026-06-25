'use client'

import { useState } from 'react'
import { addClient } from './actions'
import { LogoInput } from '@/components/logo-input'

export function ClientForm() {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [logoUrl, setLogoUrl] = useState('')
  const [logoUpload, setLogoUpload] = useState('')

  async function onSubmit(formData: FormData) {
    setLoading(true)
    formData.set('logoUrl', logoUrl)
    formData.set('logoUploadUrl', logoUpload)
    await addClient(formData)
    setLoading(false)
    setIsOpen(false)
    setLogoUrl(''); setLogoUpload('')
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium text-sm hover:bg-primary/90 transition-colors shadow-lg hover:shadow-primary/20"
      >
        + Add Client
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="glass p-6 rounded-2xl border-border/50 w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold">New Client</h3>
          <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
        <form action={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="name" className="text-sm font-medium">Name *</label>
            <input required type="text" id="name" name="name" className="bg-secondary/50 border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="industry" className="text-sm font-medium">Industry *</label>
            <input required type="text" id="industry" name="industry" className="bg-secondary/50 border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Logo</label>
            <LogoInput url={logoUrl} upload={logoUpload} onChange={({ url, upload }) => { setLogoUrl(url); setLogoUpload(upload) }} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="yearStart" className="text-sm font-medium">Year Start *</label>
              <input required type="number" id="yearStart" name="yearStart" defaultValue={new Date().getFullYear()} className="bg-secondary/50 border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="yearEnd" className="text-sm font-medium">Year End</label>
              <input type="number" id="yearEnd" name="yearEnd" placeholder="Present" className="bg-secondary/50 border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <button type="button" onClick={() => setIsOpen(false)} className="px-4 py-2 rounded-md font-medium text-sm hover:bg-secondary transition-colors text-muted-foreground">
              Cancel
            </button>
            <button disabled={loading} type="submit" className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50">
              {loading ? 'Saving...' : 'Save Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
