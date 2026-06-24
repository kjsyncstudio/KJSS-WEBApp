import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Header from '@/components/header'
import { BatchForm } from './batch-form'
import Link from 'next/link'

export default async function BatchProjectPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin' && profile?.role !== 'project_manager') redirect('/projects')

  const { data: clients } = await supabase.from('clients').select('id, name').order('name')

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/projects" className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 mb-4">
            ← Back to Projects
          </Link>
          <h2 className="text-3xl font-bold tracking-tight">Batch Add Projects</h2>
          <p className="text-muted-foreground mt-1 text-sm">Add up to 20 projects at once.</p>
        </div>
        <BatchForm clients={clients || []} />
      </main>
    </div>
  )
}
