'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { logAudit } from '@/utils/audit'

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Forbidden')
  return { supabase }
}

type Kind = 'status' | 'type'

export async function addSetting(kind: Kind, value: string) {
  const { supabase } = await assertAdmin()
  const v = value.trim()
  if (!v) return { error: 'Value required.' }
  const { data: max } = await supabase.from('project_settings').select('sort').eq('kind', kind).order('sort', { ascending: false }).limit(1).single()
  const { error } = await supabase.from('project_settings').insert({ kind, value: v, sort: (max?.sort ?? -1) + 1 })
  if (error) return { error: error.message.includes('duplicate') ? 'Already exists.' : error.message }
  revalidatePath('/admin'); revalidatePath('/projects')
  return { success: true }
}

export async function renameSetting(kind: Kind, oldValue: string, newValue: string) {
  const { supabase } = await assertAdmin()
  const v = newValue.trim()
  if (!v) return { error: 'Value required.' }
  const { error } = await supabase.from('project_settings').update({ value: v }).eq('kind', kind).eq('value', oldValue)
  if (error) return { error: error.message }
  // Cascade rename to existing projects (status/type are plain text columns)
  const col = kind === 'status' ? 'status' : 'type'
  await supabase.from('projects').update({ [col]: v }).eq(col, oldValue)
  revalidatePath('/admin'); revalidatePath('/projects')
  return { success: true }
}

export async function deleteSetting(kind: Kind, value: string) {
  const { supabase } = await assertAdmin()
  // Block deleting a value still in use
  const col = kind === 'status' ? 'status' : 'type'
  const { count } = await supabase.from('projects').select('id', { count: 'exact', head: true }).eq(col, value).is('deleted_at', null)
  if (count && count > 0) return { error: `In use by ${count} project(s).` }
  const { error } = await supabase.from('project_settings').delete().eq('kind', kind).eq('value', value)
  if (error) return { error: error.message }
  revalidatePath('/admin'); revalidatePath('/projects')
  return { success: true }
}

export async function restoreProject(id: string) {
  const { supabase } = await assertAdmin()
  const { data: p } = await supabase.from('projects').select('title').eq('id', id).single()
  const { error } = await supabase.from('projects').update({ deleted_at: null }).eq('id', id)
  if (error) return { error: error.message }
  await logAudit({ action: 'update', entity_type: 'project', entity_id: id, entity_name: p?.title, metadata: { restored: true } })
  revalidatePath('/admin'); revalidatePath('/projects')
  return { success: true }
}

export async function hardDeleteProject(id: string) {
  const { supabase } = await assertAdmin()
  const { data: p } = await supabase.from('projects').select('title').eq('id', id).single()
  const { error } = await supabase.from('projects').delete().eq('id', id)
  if (error) return { error: error.message }
  await logAudit({ action: 'delete', entity_type: 'project', entity_id: id, entity_name: p?.title, metadata: { hard: true } })
  revalidatePath('/admin')
  return { success: true }
}
