import { updatePassword } from './actions'
import { ThemeToggle } from '@/components/theme-toggle'
import { Logo } from '@/components/logo'

export default async function UpdatePasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams
  const hasError = params?.error === 'true'

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-accent/20 blur-[100px] pointer-events-none" />

      <div className="absolute top-6 right-6 z-10">
        <ThemeToggle />
      </div>

      <div className="z-10 w-full max-w-sm glass p-8 rounded-2xl shadow-2xl flex flex-col space-y-6 relative overflow-hidden border border-white/20 dark:border-white/10">
        <div className="text-center space-y-2">
          <Logo className="w-20 h-20 mx-auto object-contain mb-2" />
          <h1 className="text-2xl font-bold tracking-tight">Set your password</h1>
          <p className="text-sm text-muted-foreground">Choose a password to access your account</p>
        </div>

        <form className="flex flex-col space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="password">New Password</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              className="w-full px-3 py-2 bg-background/50 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              placeholder="Min. 8 characters"
            />
          </div>

          {hasError && (
            <p className="text-sm text-red-500 text-center">Failed to update password. Try again.</p>
          )}

          <button
            formAction={updatePassword}
            className="w-full py-2.5 px-4 bg-primary text-primary-foreground font-semibold rounded-md shadow-md hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98] mt-2"
          >
            Update Password
          </button>
        </form>
      </div>
    </div>
  )
}
