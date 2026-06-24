'use server'

import { createClient } from '@/utils/supabase/server'

type AuditAction = 'create' | 'update' | 'delete' | 'login' | 'logout' | 'invite' | 'role_change'
type AuditEntity = 'project' | 'client' | 'user' | 'note' | 'grid' | 'link' | 'auth'

interface AuditParams {
  action: AuditAction
  entity_type: AuditEntity
  entity_id?: string
  entity_name?: string
  metadata?: Record<string, unknown>
}

export async function logAudit(params: AuditParams) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('audit_log').insert({
      user_id: user.id,
      user_email: user.email,
      action: params.action,
      entity_type: params.entity_type,
      entity_id: params.entity_id ?? null,
      entity_name: params.entity_name ?? null,
      metadata: params.metadata ?? null,
    })
  } catch {
    // audit failure must never break the main action
  }
}
