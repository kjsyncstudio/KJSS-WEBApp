import { resetPassword } from './actions'
import Link from 'next/link'
import { ThemeToggle } from '@/components/theme-toggle'

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string; sent?: string; msg?: string; email?: string }> }) {
  const params = await searchParams
  const sent = params?.sent === 'true'
  const hasError = params?.error === 'true'
  const errorMsg = params?.msg
  const savedEmail = params?.email ?? ''

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 relative overflow-hidden">
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
          <h1 className="text-2xl font-bold tracking-tight">Reset Password</h1>
          <p className="text-sm text-muted-foreground">Enter your email to receive a reset link</p>
        </div>

        {sent ? (
          <div className="text-center space-y-4">
            <p className="text-sm text-green-500 font-medium">Check your email for a reset link.</p>
            <Link href="/login" className="text-sm text-primary hover:underline">Back to Sign In</Link>
          </div>
        ) : (
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
                defaultValue={savedEmail}
              />
            </div>

            {hasError && (
              <p className="text-sm text-red-500 text-center">{errorMsg ?? 'Something went wrong. Try again.'}</p>
            )}

            <button
              formAction={resetPassword}
              className="w-full py-2.5 px-4 bg-primary text-primary-foreground font-semibold rounded-md shadow-md hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98] mt-2"
            >
              Send Reset Link
            </button>

            <Link href="/login" className="text-sm text-center text-muted-foreground hover:text-foreground transition-colors">
              Back to Sign In
            </Link>
          </form>
        )}
      </div>
    </div>
  )
}
