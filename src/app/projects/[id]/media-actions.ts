'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { logProjectChange } from '@/utils/audit'

// Keep projects.thumbnail_url = first image in the gallery (the cover)
async function syncCover(projectId: string) {
  const supabase = await createClient()
  const { data } = await supabase.from('project_media').select('url, kind').eq('project_id', projectId).order('sort').limit(20)
  const firstImage = (data || []).find(m => m.kind === 'image')
  await supabase.from('projects').update({ thumbnail_url: firstImage?.url ?? null }).eq('id', projectId)
}

export async function addMedia(projectId: string, kind: 'image' | 'video', url: string) {
  if (!url?.trim()) return { error: 'URL required.' }
  const supabase = await createClient()
  const { data: max } = await supabase.from('project_media').select('sort').eq('project_id', projectId).order('sort', { ascending: false }).limit(1).maybeSingle()
  const { error } = await supabase.from('project_media').insert({ project_id: projectId, kind, url, sort: (max?.sort ?? -1) + 1 })
  if (error) return { error: error.message }
  await syncCover(projectId)
  await logProjectChange(projectId, 'image')
  revalidatePath(`/projects/${projectId}`); revalidatePath('/projects')
  return { success: true }
}

export async function deleteMedia(projectId: string, id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('project_media').delete().eq('id', id)
  if (error) return { error: error.message }
  await syncCover(projectId)
  await logProjectChange(projectId, 'image')
  revalidatePath(`/projects/${projectId}`); revalidatePath('/projects')
  return { success: true }
}

export async function reorderMedia(projectId: string, orderedIds: string[]) {
  const supabase = await createClient()
  // write new sort indices
  await Promise.all(orderedIds.map((id, i) => supabase.from('project_media').update({ sort: i }).eq('id', id)))
  await syncCover(projectId)
  revalidatePath(`/projects/${projectId}`); revalidatePath('/projects')
  return { success: true }
}
