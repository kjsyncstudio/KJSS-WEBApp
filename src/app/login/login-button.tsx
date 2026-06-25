'use client'

import { useFormStatus } from 'react-dom'
import { login } from './actions'

export function LoginButton() {
  const { pending } = useFormStatus()
  return (
    <>
      <button
        formAction={login}
        disabled={pending}
        className="w-full py-2.5 px-4 bg-primary text-primary-foreground font-semibold rounded-md shadow-md hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98] mt-2 disabled:opacity-70 disabled:hover:scale-100 flex items-center justify-center gap-2"
      >
        {pending && <span className="h-4 w-4 rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground animate-spin" />}
        {pending ? 'Logging in…' : 'Sign In'}
      </button>

      {pending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <div className="glass px-6 py-5 rounded-2xl border border-border/50 flex items-center gap-3 shadow-2xl">
            <span className="h-5 w-5 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
            <span className="text-sm font-medium">Logging in…</span>
          </div>
        </div>
      )}
    </>
  )
}
