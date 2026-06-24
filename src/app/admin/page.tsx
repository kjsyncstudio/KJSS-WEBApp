import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Header from '@/components/header'
import { MembersPanel } from './members-panel'

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
    .select('id, user_email, action, entity_type, entity_name, created_at')
    .order('created_at', { ascending: false })
    .limit(20)

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8 space-y-10">
        <div>
          <h2 className="text-3xl font-bold tracking-tight mb-1">Admin Panel</h2>
          <p className="text-muted-foreground text-sm">Manage members, roles, and monitor activity.</p>
        </div>

        <MembersPanel members={members || []} />

        <section className="space-y-4">
          <h3 className="text-xl font-semibold">Recent Activity</h3>
          <div className="glass rounded-2xl border border-border/50 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-border/50 bg-muted/20">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Time</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">User</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Action</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Target</th>
                </tr>
              </thead>
              <tbody>
                {(recentLog || []).length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">No activity yet.</td></tr>
                )}
                {(recentLog || []).map((entry, i) => (
                  <tr key={entry.id} className={`border-b border-border/30 last:border-0 ${i % 2 === 0 ? '' : 'bg-muted/5'}`}>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(entry.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{entry.user_email}</td>
                    <td className="px-4 py-3">
                      <span className="capitalize font-medium">{entry.action}</span>
                      <span className="text-muted-foreground ml-1">{entry.entity_type}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{entry.entity_name || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">Full change log with filters coming soon.</p>
        </section>
      </main>
    </div>
  )
}
