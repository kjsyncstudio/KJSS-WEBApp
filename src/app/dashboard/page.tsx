import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Header from '@/components/header'
import { DashboardClient } from './dashboard-client'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role, full_name').eq('id', user.id).single()
  const role = profile?.role || 'guest'
  const isAdmin = role === 'admin'
  const name = profile?.full_name || user.email || 'there'

  // Projects — RLS auto-limits non-admins to their permitted clients
  const { data: projects } = await supabase
    .from('projects')
    .select('id, title, type, status, description, clients ( name )')
    .is('deleted_at', null)
    .order('project_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

  const all = projects || []
  // "In progress" = Active or Expedite; expedite sorted to the top
  const inProgress = all.filter(p => p.status === 'Active' || p.status === 'Expedite')
  const activeProjects = [...inProgress]
    .sort((a, b) => (a.status === 'Expedite' ? -1 : 0) - (b.status === 'Expedite' ? -1 : 0))
    .slice(0, 15)
  const counts = {
    active: inProgress.length,
    pending: all.filter(p => p.status === 'Pending').length,
    clients: 0,
  }

  // Status breakdown across all visible projects
  const statusCounts: Record<string, number> = {}
  for (const p of all) statusCounts[p.status] = (statusCounts[p.status] || 0) + 1

  // Client count: admin = all clients; others = clients they can read
  if (isAdmin) {
    const { count } = await supabase.from('clients').select('id', { count: 'exact', head: true })
    counts.clients = count ?? 0
  } else {
    const { count } = await supabase.from('client_permissions').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('can_read', true)
    counts.clients = count ?? 0
  }

  // Recent project changes — admin only (contractors have no admin/activity view)
  let recentChanges: unknown[] = []
  if (isAdmin) {
    const { data } = await supabase
      .from('audit_log')
      .select('id, user_email, entity_id, entity_name, created_at')
      .eq('entity_type', 'project').eq('action', 'update')
      .order('created_at', { ascending: false })
      .limit(6)
    recentChanges = data || []
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <DashboardClient
          name={name}
          isAdmin={isAdmin}
          activeProjects={activeProjects as never}
          counts={counts}
          statusCounts={statusCounts}
          recentChanges={recentChanges as never}
        />
      </main>
    </div>
  )
}
