import { ThemeToggle } from '@/components/theme-toggle'
import { Logo } from '@/components/logo'
import { LoginForm } from './login-form'

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; email?: string }> }) {
  const params = await searchParams
  const hasError = params?.error === 'true'
  const defaultEmail = params?.email ?? ''
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
          <Logo className="w-24 h-24 mx-auto object-contain mb-2" />
          <h1 className="text-2xl font-bold tracking-tight">Welcome Back</h1>
          <p className="text-sm text-muted-foreground">Sign in to your KJ Sync Studio account</p>
        </div>

        <LoginForm defaultEmail={defaultEmail} hasError={hasError} />
      </div>
    </div>
  )
}
