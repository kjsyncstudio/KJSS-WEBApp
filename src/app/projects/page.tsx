import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Header from '@/components/header'
import { ProjectForm } from './project-form'
import { ProjectList } from './project-list'
import Link from 'next/link'

export default async function ProjectsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch the user's role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role || 'guest'
  const isAdmin = role === 'admin'

  // Clients this user may edit (write delegation); admins edit everything
  let writableClients: string[] = []
  if (!isAdmin) {
    const { data: perms } = await supabase.from('client_permissions').select('client_id').eq('user_id', user.id).eq('can_write', true)
    writableClients = (perms || []).map(p => p.client_id)
  }
  const canManage = isAdmin || writableClients.length > 0

  // Fetch projects (RLS will automatically filter for contractors/guests based on assignments)
  const { data: projects } = await supabase
    .from('projects')
    .select(`
      *,
      clients ( name )
    `)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  // If they can manage, fetch all clients for the project creation form
  let clients: any[] = []
  if (canManage) {
    const { data } = await supabase.from('clients').select('id, name').order('name')
    if (data) clients = data
  }

  // Editable statuses / types from admin settings
  const { data: settings } = await supabase.from('project_settings').select('kind, value').order('sort')
  const statuses = (settings || []).filter(s => s.kind === 'status').map(s => s.value)
  const types = (settings || []).filter(s => s.kind === 'type').map(s => s.value)

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Projects</h2>
            <p className="text-muted-foreground mt-2">
              Manage your projects, view status, and collaborate.
            </p>
          </div>
          {isAdmin && (
            <div className="flex gap-3">
              <Link href="/projects/batch" className="border border-border px-4 py-2 rounded-md font-medium text-sm hover:bg-muted/50 transition-colors">
                Batch Add
              </Link>
              <ProjectForm clients={clients} statuses={statuses} types={types} />
            </div>
          )}
        </div>

        <ProjectList projects={projects || []} canManage={canManage} isAdmin={isAdmin} writableClients={writableClients} clients={clients} statuses={statuses} types={types} />
      </main>
    </div>
  )
}
