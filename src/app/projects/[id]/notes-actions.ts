'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { logProjectChange } from '@/utils/audit'

export async function saveTextPad(projectId: string, content: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Try to update first
  let { error } = await supabase
    .from('project_text_notes')
    .update({ content, last_edited_by: user?.id, updated_at: new Date().toISOString() })
    .eq('project_id', projectId)

  // If no rows were updated, insert
  if (error || (await supabase.from('project_text_notes').select('project_id').eq('project_id', projectId)).data?.length === 0) {
    await supabase.from('project_text_notes').insert({
      project_id: projectId,
      content,
      last_edited_by: user?.id
    })
  }

  await logProjectChange(projectId, undefined, 'notes')
  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}

export async function addGridColumn(projectId: string, colIndex: number, header: string) {
  const supabase = await createClient()
  
  const { error } = await supabase.from('project_grid_columns').insert({
    project_id: projectId,
    col_index: colIndex,
    header
  })

  if (error) {
    console.error('Error adding column:', error)
    return { error: error.message }
  }

  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}

export async function updateGridColumn(projectId: string, colIndex: number, header: string) {
  const supabase = await createClient()
  
  const { error } = await supabase.from('project_grid_columns')
    .update({ header })
    .eq('project_id', projectId)
    .eq('col_index', colIndex)

  if (error) {
    console.error('Error updating column:', error)
    return { error: error.message }
  }

  await logProjectChange(projectId, undefined, 'sheet')
  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}

export async function saveGridCell(projectId: string, rowIndex: number, colIndex: number, value: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { error } = await supabase.from('project_grid_cells').upsert({
    project_id: projectId,
    row_index: rowIndex,
    col_index: colIndex,
    value,
    last_edited_by: user?.id,
    updated_at: new Date().toISOString()
  }, { onConflict: 'project_id, row_index, col_index' })

  if (error) {
    console.error('Error saving cell:', error)
    return { error: error.message }
  }

  await logProjectChange(projectId, undefined, 'sheet')
  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}
