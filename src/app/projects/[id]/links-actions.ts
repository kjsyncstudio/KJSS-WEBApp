'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addUploadLink(projectId: string, formData: FormData) {
  const supabase = await createClient()
  
  const title = formData.get('title') as string || 'Upload Link'
  const url = formData.get('url') as string
  
  const { error } = await supabase.from('project_upload_links').insert({
    project_id: projectId,
    title,
    url
  })

  if (error) {
    console.error('Error adding upload link:', error)
    return { error: error.message }
  }

  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}

export async function deleteUploadLink(projectId: string, linkId: string) {
  const supabase = await createClient()
  
  const { error } = await supabase.from('project_upload_links').delete().eq('id', linkId)

  if (error) {
    console.error('Error deleting upload link:', error)
    return { error: error.message }
  }

  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}

export async function addFinalUrl(projectId: string, formData: FormData) {
  const supabase = await createClient()
  
  const platform = formData.get('platform') as string || 'Custom'
  const url = formData.get('url') as string
  
  const { error } = await supabase.from('project_final_urls').insert({
    project_id: projectId,
    platform,
    url
  })

  if (error) {
    console.error('Error adding final url:', error)
    return { error: error.message }
  }

  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}

export async function deleteFinalUrl(projectId: string, urlId: string) {
  const supabase = await createClient()
  
  const { error } = await supabase.from('project_final_urls').delete().eq('id', urlId)

  if (error) {
    console.error('Error deleting final url:', error)
    return { error: error.message }
  }

  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}
