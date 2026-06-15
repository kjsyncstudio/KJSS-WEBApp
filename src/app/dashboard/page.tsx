import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Header from '@/components/header'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch the user's role from the profiles table
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  const role = profile?.role || 'Guest'
  const name = profile?.full_name || user.email

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold tracking-tight">Welcome, {name}</h2>
          <p className="text-muted-foreground mt-2">
            Here's an overview of your projects and clients.
          </p>
        </div>

        {role === 'admin' && (
          <div className="glass p-6 rounded-2xl border-border/50 mb-8 bg-primary/5">
            <h3 className="text-xl font-semibold mb-2">Admin Controls</h3>
            <p className="text-sm text-muted-foreground mb-4">
              You have full access to manage clients, projects, and users.
            </p>
            <div className="flex gap-4">
              <button className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium text-sm hover:bg-primary/90 transition-colors">
                Register New User
              </button>
            </div>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Dashboard cards placeholders */}
          <div className="glass p-6 rounded-2xl border-border/50 flex flex-col gap-2">
            <h3 className="font-medium text-muted-foreground">Active Projects</h3>
            <span className="text-4xl font-bold">0</span>
          </div>
          <div className="glass p-6 rounded-2xl border-border/50 flex flex-col gap-2">
            <h3 className="font-medium text-muted-foreground">Clients</h3>
            <span className="text-4xl font-bold">0</span>
          </div>
          <div className="glass p-6 rounded-2xl border-border/50 flex flex-col gap-2">
            <h3 className="font-medium text-muted-foreground">Pending Tasks</h3>
            <span className="text-4xl font-bold">0</span>
          </div>
        </div>
      </main>
    </div>
  )
}
