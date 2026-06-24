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

export async function setClientPermission(userId: string, clientId: string, canRead: boolean, canWrite: boolean) {
  const { supabase } = await assertAdmin()
  if (!userId || !clientId) return { error: 'User and client required.' }

  // No access at all → remove the row
  if (!canRead && !canWrite) {
    await supabase.from('client_permissions').delete().eq('user_id', userId).eq('client_id', clientId)
    revalidatePath('/admin'); revalidatePath('/projects')
    return { success: true }
  }

  const { error } = await supabase.from('client_permissions')
    .upsert({ user_id: userId, client_id: clientId, can_read: canRead, can_write: canWrite }, { onConflict: 'user_id,client_id' })
  if (error) return { error: error.message }

  await logAudit({ action: 'role_change', entity_type: 'user', entity_id: userId, metadata: { client_id: clientId, can_read: canRead, can_write: canWrite } })
  revalidatePath('/admin'); revalidatePath('/projects')
  return { success: true }
}

export async function removeClientPermission(userId: string, clientId: string) {
  const { supabase } = await assertAdmin()
  const { error } = await supabase.from('client_permissions').delete().eq('user_id', userId).eq('client_id', clientId)
  if (error) return { error: error.message }
  revalidatePath('/admin'); revalidatePath('/projects')
  return { success: true }
}
