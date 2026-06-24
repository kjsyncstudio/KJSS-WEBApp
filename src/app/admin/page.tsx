import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Header from '@/components/header'
import { AdminTabs } from './admin-tabs'

export default async function AdminPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: members } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, created_at')
    .order('created_at', { ascending: true })

  const { data: recentLog } = await supabase
    .from('audit_log')
    .select('id, user_email, action, entity_type, entity_id, entity_name, created_at')
    .order('created_at', { ascending: false })
    .limit(40)

  const { data: settings } = await supabase.from('project_settings').select('kind, value').order('sort')
  const statuses = (settings || []).filter(s => s.kind === 'status').map(s => s.value)
  const types = (settings || []).filter(s => s.kind === 'type').map(s => s.value)

  const { data: deleted } = await supabase
    .from('projects')
    .select('id, title, deleted_at, clients ( name )')
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false })

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 space-y-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight mb-1">Admin Panel</h2>
          <p className="text-muted-foreground text-sm">Manage members, project settings, and monitor activity.</p>
        </div>

        <AdminTabs
          members={members || []}
          recentLog={recentLog || []}
          statuses={statuses}
          types={types}
          deleted={(deleted as never) || []}
        />
      </main>
    </div>
  )
}
