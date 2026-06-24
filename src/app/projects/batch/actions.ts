'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { logAudit } from '@/utils/audit'
import { redirect } from 'next/navigation'

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
    inserts.push({ title, client_id: clientId, type, status, description, project_date: projectDate || null, thumbnail_url: thumbnailUrl || null })
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
