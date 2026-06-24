'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { logAudit } from '@/utils/audit'

export async function addProject(formData: FormData) {
  const supabase = await createClient()

  const title = formData.get('title') as string
  const type = formData.get('type') as string
  const clientId = formData.get('clientId') as string
  const status = formData.get('status') as 'Active' | 'Done' | 'Shelved' | 'Pending'
  const description = formData.get('description') as string
  const projectDate = formData.get('projectDate') as string

  const { data, error } = await supabase.from('projects').insert({
    title,
    type,
    client_id: clientId,
    status,
    description,
    project_date: projectDate || null,
  }).select().single()

  if (error) {
    console.error('Error adding project:', error)
    return { error: error.message }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    await supabase.from('project_members').insert({ project_id: data.id, user_id: user.id })
  }

  await logAudit({ action: 'create', entity_type: 'project', entity_id: data.id, entity_name: title })
  revalidatePath('/projects')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function deleteProject(id: string) {
  const supabase = await createClient()

  const { data: project } = await supabase.from('projects').select('title').eq('id', id).single()
  // Soft delete: move to bin, only admins hard-delete later
  const { error } = await supabase.from('projects').update({ deleted_at: new Date().toISOString() }).eq('id', id)

  if (error) {
    console.error('Error deleting project:', error)
    return { error: error.message }
  }

  await logAudit({ action: 'delete', entity_type: 'project', entity_id: id, entity_name: project?.title })
  revalidatePath('/projects')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function bulkDeleteProjects(ids: string[]) {
  const supabase = await createClient()
  const { error } = await supabase.from('projects').update({ deleted_at: new Date().toISOString() }).in('id', ids)
  if (error) return { error: error.message }
  for (const id of ids) await logAudit({ action: 'delete', entity_type: 'project', entity_id: id })
  revalidatePath('/projects')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function bulkUpdateProjects(ids: string[], fields: { type?: string; client_id?: string; project_date?: string | null }) {
  const supabase = await createClient()
  const update: Record<string, unknown> = {}
  if (fields.type) update.type = fields.type
  if (fields.client_id) update.client_id = fields.client_id
  if ('project_date' in fields) update.project_date = fields.project_date || null
  if (Object.keys(update).length === 0) return { error: 'Nothing to update.' }
  const { error } = await supabase.from('projects').update(update).in('id', ids)
  if (error) return { error: error.message }
  for (const id of ids) await logAudit({ action: 'update', entity_type: 'project', entity_id: id, metadata: fields })
  revalidatePath('/projects')
  return { success: true }
}

export async function updateProjectStatus(id: string, status: string) {
  const supabase = await createClient()

  const { data: project } = await supabase.from('projects').select('title, status').eq('id', id).single()
  const { error } = await supabase.from('projects').update({ status }).eq('id', id)

  if (error) {
    console.error('Error updating project status:', error)
    return { error: error.message }
  }

  await logAudit({
    action: 'update',
    entity_type: 'project',
    entity_id: id,
    entity_name: project?.title,
    metadata: { old_status: project?.status, new_status: status },
  })
  revalidatePath('/projects')
  revalidatePath('/dashboard')
  return { success: true }
}
