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
  const { error } = await supabase.from('projects').delete().eq('id', id)

  if (error) {
    console.error('Error deleting project:', error)
    return { error: error.message }
  }

  await logAudit({ action: 'delete', entity_type: 'project', entity_id: id, entity_name: project?.title })
  revalidatePath('/projects')
  revalidatePath('/dashboard')
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
