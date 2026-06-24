'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { logAudit } from '@/utils/audit'
import { redirect } from 'next/navigation'

// Coerce loose date input to YYYY-MM-DD or null. "2024" -> "2024-01-01", "2024-03" -> "2024-03-01".
function normalizeDate(v: string | null): string | null {
  if (!v) return null
  const s = v.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  if (/^\d{4}-\d{1,2}$/.test(s)) { const [y, m] = s.split('-'); return `${y}-${m.padStart(2, '0')}-01` }
  if (/^\d{4}$/.test(s)) return `${s}-01-01`
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10)
}

export async function batchAddProjects(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const count = parseInt(formData.get('count') as string)
  const inserts = []

  for (let i = 0; i < count; i++) {
    const title = formData.get(`title_${i}`) as string
    const clientId = formData.get(`clientId_${i}`) as string
    const type = formData.get(`type_${i}`) as string
    const status = formData.get(`status_${i}`) as string
    const description = formData.get(`description_${i}`) as string
    const projectDate = formData.get(`projectDate_${i}`) as string
    const thumbnailUrl = formData.get(`thumbnailUrl_${i}`) as string
    if (!title || !clientId || !type || !status) continue
    inserts.push({ title, client_id: clientId, type, status, description, project_date: normalizeDate(projectDate), thumbnail_url: thumbnailUrl || null })
  }

  if (inserts.length === 0) return { error: 'No valid rows.' }

  const { data, error } = await supabase.from('projects').insert(inserts).select('id, title')
  if (error) return { error: error.message }

  // Add current user as member of each project
  if (data) {
    await supabase.from('project_members').insert(
      data.map(p => ({ project_id: p.id, user_id: user.id }))
    )
    for (const p of data) {
      await logAudit({ action: 'create', entity_type: 'project', entity_id: p.id, entity_name: p.title, metadata: { batch: true } })
    }
  }

  revalidatePath('/projects')
  revalidatePath('/dashboard')
  redirect('/projects')
}
