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
  const activeProjects = all.filter(p => p.status === 'Active').slice(0, 12)
  const counts = {
    active: all.filter(p => p.status === 'Active').length,
    pending: all.filter(p => p.status === 'Pending').length,
    clients: 0,
  }

  // Client count: admin = all clients; others = clients they can read
  if (isAdmin) {
    const { count } = await supabase.from('clients').select('id', { count: 'exact', head: true })
    counts.clients = count ?? 0
  } else {
    const { count } = await supabase.from('client_permissions').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('can_read', true)
    counts.clients = count ?? 0
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <DashboardClient
          name={name}
          role={role}
          isAdmin={isAdmin}
          activeProjects={activeProjects as never}
          counts={counts}
        />
      </main>
    </div>
  )
}
