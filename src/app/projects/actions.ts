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
    project_date: /^\d{4}-\d{2}-\d{2}$/.test(projectDate || '') ? projectDate : null,
    completed_at: /^(completed|done)$/i.test(status) ? new Date().toISOString() : null,
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

export async function updateProjectTitle(id: string, title: string) {
  const supabase = await createClient()
  const t = title.trim()
  if (!t) return { error: 'Title required.' }
  const { error } = await supabase.from('projects').update({ title: t }).eq('id', id)
  if (error) return { error: error.message }
  await logAudit({ action: 'update', entity_type: 'project', entity_id: id, entity_name: t, metadata: { field: 'title' } })
  revalidatePath('/projects')
  return { success: true }
}

function providerTitle(url: string): string {
  try {
    const h = new URL(url).hostname.replace(/^www\./, '')
    if (/drive\.google|docs\.google/.test(h)) return 'Google Drive'
    if (/dropbox/.test(h)) return 'Dropbox'
    if (/youtube|youtu\.be/.test(h)) return 'YouTube'
    if (/wetransfer/.test(h)) return 'WeTransfer'
    return h
  } catch { return 'Link' }
}

// Batch edit selected projects. mode 'override' sets provided fields; 'empty' only fills blanks.
export async function batchEditProjects(
  ids: string[],
  fields: { clientId?: string; date?: string; type?: string; link?: string },
  mode: 'override' | 'empty',
) {
  if (ids.length === 0) return { error: 'Nothing selected.' }
  const supabase = await createClient()

  const { data: current } = await supabase.from('projects').select('id, title, project_date').in('id', ids)
  const dateById: Record<string, string | null> = Object.fromEntries((current || []).map(p => [p.id, p.project_date]))
  const titleById: Record<string, string> = Object.fromEntries((current || []).map(p => [p.id, p.title]))

  let linkCounts: Record<string, number> = {}
  if (fields.link && mode === 'empty') {
    const { data: links } = await supabase.from('project_upload_links').select('project_id').in('project_id', ids)
    for (const l of links || []) linkCounts[l.project_id] = (linkCounts[l.project_id] || 0) + 1
  }

  for (const id of ids) {
    const upd: Record<string, unknown> = {}
    if (mode === 'override') {
      if (fields.type) upd.type = fields.type
      if (fields.clientId) upd.client_id = fields.clientId
      if (fields.date) upd.project_date = fields.date
    } else {
      if (fields.date && !dateById[id]) upd.project_date = fields.date  // type/client are never empty
    }
    if (Object.keys(upd).length) await supabase.from('projects').update(upd).eq('id', id)

    if (fields.link && (mode === 'override' || !(linkCounts[id] > 0))) {
      await supabase.from('project_upload_links').insert({ project_id: id, title: providerTitle(fields.link), url: fields.link })
    }
    await logAudit({ action: 'update', entity_type: 'project', entity_id: id, entity_name: titleById[id], metadata: { batch: true, mode, ...fields } })
  }

  revalidatePath('/projects')
  return { success: true }
}

export async function updateProjectStatus(id: string, status: string) {
  const supabase = await createClient()

  const { data: project } = await supabase.from('projects').select('title, status').eq('id', id).single()
  // Stamp completed_at when entering Completed, clear when leaving it
  const isCompleted = /^(completed|done)$/i.test(status)
  const wasCompleted = /^(completed|done)$/i.test(project?.status ?? '')
  const patch: Record<string, unknown> = { status }
  if (isCompleted && !wasCompleted) patch.completed_at = new Date().toISOString()
  else if (!isCompleted && wasCompleted) patch.completed_at = null
  const { error } = await supabase.from('projects').update(patch).eq('id', id)

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
