'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function addProject(formData: FormData) {
  const supabase = await createClient()
  
  const title = formData.get('title') as string
  const type = formData.get('type') as string
  const clientId = formData.get('clientId') as string
  const status = formData.get('status') as 'Active' | 'Done' | 'Shelved' | 'Pending'
  const description = formData.get('description') as string
  
  const { data, error } = await supabase.from('projects').insert({
    title,
    type,
    client_id: clientId,
    status,
    description
  }).select().single()

  if (error) {
    console.error('Error adding project:', error)
    return { error: error.message }
  }

  // Also add the admin (current user) as a project member by default
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    await supabase.from('project_members').insert({
      project_id: data.id,
      user_id: user.id
    })
  }

  revalidatePath('/projects')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function deleteProject(id: string) {
  const supabase = await createClient()
  
  const { error } = await supabase.from('projects').delete().eq('id', id)

  if (error) {
    console.error('Error deleting project:', error)
    return { error: error.message }
  }

  revalidatePath('/projects')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function updateProjectStatus(id: string, status: string) {
  const supabase = await createClient()
  
  const { error } = await supabase.from('projects').update({ status }).eq('id', id)

  if (error) {
    console.error('Error updating project status:', error)
    return { error: error.message }
  }

  revalidatePath('/projects')
  revalidatePath('/dashboard')
  return { success: true }
}
