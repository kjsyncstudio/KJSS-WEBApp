'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { logAudit } from '@/utils/audit'

export async function toggleGuestViewable(projectId: string, value: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthenticated' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Forbidden' }

  const { error } = await supabase.from('projects').update({ guest_viewable: value }).eq('id', projectId)
  if (error) return { error: error.message }

  await logAudit({
    action: 'update',
    entity_type: 'project',
    entity_id: projectId,
    metadata: { guest_viewable: value },
  })

  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}
