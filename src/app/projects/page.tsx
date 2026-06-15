import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Header from '@/components/header'
import { ProjectForm } from './project-form'
import { ProjectList } from './project-list'

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
  const canManage = role === 'admin'

  // Fetch projects (RLS will automatically filter for contractors/guests based on assignments)
  const { data: projects } = await supabase
    .from('projects')
    .select(`
      *,
      clients ( name )
    `)
    .order('created_at', { ascending: false })

  // If they can manage, fetch all clients for the project creation form
  let clients: any[] = []
  if (canManage) {
    const { data } = await supabase.from('clients').select('id, name').order('name')
    if (data) clients = data
  }

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
          {canManage && <ProjectForm clients={clients} />}
        </div>

        <ProjectList projects={projects || []} canManage={canManage} />
      </main>
    </div>
  )
}
