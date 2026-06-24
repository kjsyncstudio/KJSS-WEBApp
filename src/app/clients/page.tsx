import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Header from '@/components/header'
import { ClientForm } from './client-form'
import { ClientList } from './client-list'

export default async function ClientsPage() {
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

  // Fetch clients
  let query = supabase.from('clients').select('*').order('created_at', { ascending: false })

  // Non-admins only see clients they have read permission on
  if (!canManage) {
    const { data: perms } = await supabase.from('client_permissions').select('client_id').eq('user_id', user.id).eq('can_read', true)
    const allowed = (perms || []).map(p => p.client_id)
    if (allowed.length === 0) { query = query.eq('id', '00000000-0000-0000-0000-000000000000') }
    else { query = query.in('id', allowed) }
  }

  const { data: clients } = await query

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Clients</h2>
            <p className="text-muted-foreground mt-2">
              Manage your clients and their details.
            </p>
          </div>
          {canManage && <ClientForm />}
        </div>

        <ClientList clients={clients || []} canManage={canManage} />
      </main>
    </div>
  )
}
