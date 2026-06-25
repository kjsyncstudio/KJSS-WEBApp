'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

type AuditAction = 'create' | 'update' | 'delete' | 'login' | 'logout' | 'invite' | 'role_change'
type AuditEntity = 'project' | 'client' | 'user' | 'note' | 'grid' | 'link' | 'auth'

interface AuditParams {
  action: AuditAction
  entity_type: AuditEntity
  entity_id?: string
  entity_name?: string
  metadata?: Record<string, unknown>
}

// Record that a user changed `field` within a project. Within a time window,
// all of that user's field-changes on the project collapse into ONE rolling
// audit entry whose metadata.fields accumulates ('notes','description',...).
// Uses the service-role client so it can read-modify-write the audit row.
export async function logProjectChange(projectId: string, field: string, windowMinutes = 30) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const admin = createAdminClient()
    const since = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString()

    const { data: recent } = await admin
      .from('audit_log')
      .select('id, metadata')
      .eq('entity_id', projectId)
      .eq('entity_type', 'project')
      .eq('action', 'update')
      .eq('user_id', user.id)
      .contains('metadata', { kind: 'fields' })
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (recent) {
      const existing: string[] = (recent.metadata?.fields as string[]) ?? []
      const fields = Array.from(new Set([...existing, field]))
      await admin.from('audit_log')
        .update({ metadata: { kind: 'fields', fields }, created_at: new Date().toISOString() })
        .eq('id', recent.id)
      return
    }

    const { data: p } = await admin.from('projects').select('title').eq('id', projectId).single()
    await admin.from('audit_log').insert({
      user_id: user.id,
      user_email: user.email,
      action: 'update',
      entity_type: 'project',
      entity_id: projectId,
      entity_name: p?.title ?? null,
      metadata: { kind: 'fields', fields: [field] },
    })
  } catch {
    // never break the save
  }
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
