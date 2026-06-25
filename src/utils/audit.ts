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

// Log a project "change", throttled to one entry per user+project per window
// so autosave keystrokes don't flood the audit log.
export async function logProjectChange(projectId: string, projectName?: string, field?: string, windowMinutes = 5) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const since = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString()
    const { data: recent } = await supabase
      .from('audit_log')
      .select('id')
      .eq('entity_id', projectId)
      .eq('entity_type', 'project')
      .eq('action', 'update')
      .eq('user_id', user.id)
      .gte('created_at', since)
      .limit(1)
    if (recent && recent.length > 0) return  // already logged recently

    let name = projectName
    if (!name) {
      const { data: p } = await supabase.from('projects').select('title').eq('id', projectId).single()
      name = p?.title
    }

    await supabase.from('audit_log').insert({
      user_id: user.id,
      user_email: user.email,
      action: 'update',
      entity_type: 'project',
      entity_id: projectId,
      entity_name: name ?? null,
      metadata: field ? { field } : null,
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
