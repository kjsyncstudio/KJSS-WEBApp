import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { Logo } from '@/components/logo'
import { ThemeToggle } from '@/components/theme-toggle'

export const metadata = { title: 'Portfolio — KJ Sync Studio' }

type Proj = { id: string; title: string; type: string; thumbnail_url: string | null; clients?: { name: string } | null }

export default async function PortfolioPage() {
  const supabase = await createClient()

  // RLS: anon can read guest-viewable projects only
  const { data } = await supabase
    .from('projects')
    .select('id, title, type, thumbnail_url, clients ( name )')
    .eq('guest_viewable', true)
    .is('deleted_at', null)
    .order('project_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

  const projects = ((data as never) as Proj[]) || []

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Public header */}
      <header className="border-b border-border bg-background">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/portfolio" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Logo className="h-9 w-9 object-contain" />
            <span className="font-semibold text-base tracking-tight">KJ Sync Studio</span>
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Sign in</Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-3">Our Work</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">Selected projects from KJ Sync Studio — media production, events, and more.</p>
        </section>

        {/* Grid */}
        <section className="container mx-auto px-4 pb-20">
          {projects.length === 0 ? (
            <p className="text-center text-muted-foreground py-16">No public projects yet.</p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map(p => (
                <Link key={p.id} href={`/projects/${p.id}`}
                  className="group rounded-2xl overflow-hidden border border-border/50 bg-card hover:border-primary/40 hover:shadow-[0_0_28px_-4px_hsl(var(--primary)/0.25)] transition-all duration-200 hover:-translate-y-0.5">
                  <div className="aspect-[4/3] bg-muted/40 overflow-hidden">
                    {p.thumbnail_url
                      ? <img src={p.thumbnail_url} alt={p.title} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300" />
                      : <div className="w-full h-full bg-gradient-to-br from-primary/15 to-accent/15 flex items-center justify-center text-3xl font-bold text-primary/40">{p.title.charAt(0)}</div>}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold leading-tight group-hover:text-primary transition-colors">{p.title}</h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <span>{p.clients?.name ?? '—'}</span><span>•</span><span>{p.type}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} KJ Sync Studio
      </footer>
    </div>
  )
}
