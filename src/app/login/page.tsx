import Link from 'next/link'
import { ThemeToggle } from '@/components/theme-toggle'
import { LoginButton } from './login-button'

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams
  const hasError = params?.error === 'true'
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-accent/20 blur-[100px] pointer-events-none" />

      <div className="absolute top-6 right-6 z-10">
        <ThemeToggle />
      </div>

      <div className="z-10 w-full max-w-sm glass p-8 rounded-2xl shadow-2xl flex flex-col space-y-6 relative overflow-hidden border border-white/20 dark:border-white/10">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg mb-4">
            <span className="text-xl font-bold text-white">KJS</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Welcome Back</h1>
          <p className="text-sm text-muted-foreground">Sign in to your KJS Studio account</p>
        </div>

        <form className="flex flex-col space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="email">Email</label>
            <input 
              id="email" 
              name="email" 
              type="email" 
              required 
              className="w-full px-3 py-2 bg-background/50 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              placeholder="you@example.com"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="password">Password</label>
            <input 
              id="password" 
              name="password" 
              type="password" 
              required 
              className="w-full px-3 py-2 bg-background/50 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
          </div>

          {hasError && (
            <p className="text-sm text-red-500 text-center -mb-2">Invalid email or password.</p>
          )}

          <LoginButton />

          <Link href="/forgot-password" className="text-sm text-center text-muted-foreground hover:text-foreground transition-colors">
            Forgot password?
          </Link>
        </form>
      </div>
    </div>
  )
}
