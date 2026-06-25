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

  return (
    <header className="border-b border-border bg-background sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Logo className="h-10 w-10 object-contain" />
            <span className="font-semibold text-base hidden sm:block tracking-tight">Sync Studios</span>
          </Link>
          {user && (
            <nav className="hidden md:flex items-center gap-4 text-sm font-medium text-muted-foreground">
              <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
              <Link href="/clients" className="hover:text-foreground transition-colors">Clients</Link>
              <Link href="/projects" className="hover:text-foreground transition-colors">Projects</Link>
              {role === 'admin' && (
                <Link href="/admin" className="hover:text-foreground transition-colors">Admin</Link>
              )}
            </nav>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          {user && (
            <span className="text-sm text-muted-foreground bg-secondary/50 px-3 py-1 rounded-full border border-border">
              Role: <strong className="text-foreground">{role === 'project_manager' ? 'Project Manager' : role.charAt(0).toUpperCase() + role.slice(1)}</strong>
            </span>
          )}
          <ThemeToggle />
          {user && (
            <form action={logout}>
              <button className="text-sm font-medium text-destructive hover:underline">
                Sign Out
              </button>
            </form>
          )}
        </div>
      </div>
    </header>
  )
}
