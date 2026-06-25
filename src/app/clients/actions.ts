'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addClient(formData: FormData) {
  const supabase = await createClient()
  
  const name = formData.get('name') as string
  const industry = formData.get('industry') as string
  const yearStart = parseInt(formData.get('yearStart') as string)
  const yearEnd = formData.get('yearEnd') ? parseInt(formData.get('yearEnd') as string) : null
  const logoUrl = formData.get('logoUrl') as string | null
  const logoUploadUrl = formData.get('logoUploadUrl') as string | null

  const { error } = await supabase.from('clients').insert({
    name,
    industry,
    year_start: yearStart,
    year_end: yearEnd,
    logo_url: logoUrl || null,
    logo_upload_url: logoUploadUrl || null,
  })

  if (error) {
    console.error('Error adding client:', error)
    return { error: error.message }
  }

  revalidatePath('/clients')
  return { success: true }
}

export async function deleteClient(id: string) {
  const supabase = await createClient()
  
  const { error } = await supabase.from('clients').delete().eq('id', id)

  if (error) {
    console.error('Error deleting client:', error)
    return { error: error.message }
  }

  revalidatePath('/clients')
  return { success: true }
}

export async function updateClient(id: string, formData: FormData) {
  const supabase = await createClient()
  
  const name = formData.get('name') as string
  const industry = formData.get('industry') as string
  const yearStart = parseInt(formData.get('yearStart') as string)
  const yearEnd = formData.get('yearEnd') ? parseInt(formData.get('yearEnd') as string) : null
  const logoUrl = formData.get('logoUrl') as string | null
  const logoUploadUrl = formData.get('logoUploadUrl') as string | null

  const { error } = await supabase.from('clients').update({
    name,
    industry,
    year_start: yearStart,
    year_end: yearEnd,
    logo_url: logoUrl || null,
    logo_upload_url: logoUploadUrl || null,
  }).eq('id', id)

  if (error) {
    console.error('Error updating client:', error)
    return { error: error.message }
  }

  revalidatePath('/clients')
  return { success: true }
}
