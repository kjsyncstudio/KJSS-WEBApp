'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { logAudit } from '@/utils/audit'

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Forbidden')
  return { supabase, user }
}

export async function inviteUser(formData: FormData) {
  await assertAdmin()
  const adminClient = createAdminClient()
  const email = formData.get('email') as string
  const role = formData.get('role') as string
  const fullName = formData.get('full_name') as string

  const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName },
  })
  if (error) return { error: error.message }

  // Set role on the newly created profile (trigger creates it as 'guest')
  if (data.user) {
    await adminClient.from('profiles').update({ role, full_name: fullName }).eq('id', data.user.id)
  }

  await logAudit({ action: 'invite', entity_type: 'user', entity_id: data.user?.id, entity_name: email, metadata: { role } })
  revalidatePath('/admin')
  return { success: true }
}

export async function updateUserRole(userId: string, newRole: string, userEmail: string) {
  const { supabase } = await assertAdmin()

  const { data: oldProfile } = await supabase.from('profiles').select('role').eq('id', userId).single()

  const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId)
  if (error) return { error: error.message }

  await logAudit({
    action: 'role_change',
    entity_type: 'user',
    entity_id: userId,
    entity_name: userEmail,
    metadata: { old_role: oldProfile?.role, new_role: newRole },
  })
  revalidatePath('/admin')
  return { success: true }
}

export async function deleteUser(userId: string, userEmail: string) {
  await assertAdmin()
  const adminClient = createAdminClient()

  const { error } = await adminClient.auth.admin.deleteUser(userId)
  if (error) return { error: error.message }

  await logAudit({ action: 'delete', entity_type: 'user', entity_id: userId, entity_name: userEmail })
  revalidatePath('/admin')
  return { success: true }
}
