import { createClient } from '@/utils/supabase/server'
import { logout } from '@/app/login/actions'
import { ThemeToggle } from '@/components/theme-toggle'
import { Logo } from '@/components/logo'
import Link from 'next/link'

export default async function Header() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  let role = 'Guest'
  
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
      
    if (profile) role = profile.role
  }

  const roleLabel = role === 'project_manager' ? 'Project Manager' : role.charAt(0).toUpperCase() + role.slice(1)

  return (
    <header className="border-b border-border bg-background sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-3">
        <div className="flex items-center gap-6 min-w-0">
          <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity shrink-0">
            <Logo className="h-9 w-9 object-contain" />
            <span className="font-semibold text-base hidden sm:block tracking-tight">KJ Sync Studio</span>
          </Link>
          {user && (
            <nav className="hidden md:flex items-center gap-4 text-sm font-medium text-muted-foreground">
              <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
              <Link href="/clients" className="hover:text-foreground transition-colors">Clients</Link>
              <Link href="/projects" className="hover:text-foreground transition-colors">Projects</Link>
              {role === 'admin' && <Link href="/admin" className="hover:text-foreground transition-colors">Admin</Link>}
            </nav>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          {user && (
            <span className="hidden sm:inline-flex text-sm text-muted-foreground bg-secondary/50 px-3 py-1 rounded-full border border-border whitespace-nowrap">
              Role: <strong className="text-foreground ml-1">{roleLabel}</strong>
            </span>
          )}
          <ThemeToggle />
          {user && (
            <form action={logout}>
              <button className="text-sm font-medium text-destructive hover:underline whitespace-nowrap">Sign Out</button>
            </form>
          )}
        </div>
      </div>

      {/* Mobile nav */}
      {user && (
        <nav className="md:hidden flex items-center gap-1 px-2 pb-2 overflow-x-auto border-t border-border/50 text-sm font-medium">
          <Link href="/dashboard" className="px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors whitespace-nowrap">Dashboard</Link>
          <Link href="/clients" className="px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors whitespace-nowrap">Clients</Link>
          <Link href="/projects" className="px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors whitespace-nowrap">Projects</Link>
          {role === 'admin' && <Link href="/admin" className="px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors whitespace-nowrap">Admin</Link>}
        </nav>
      )}
    </header>
  )
}
