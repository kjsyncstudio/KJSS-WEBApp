'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { LoginButton } from './login-button'

export function LoginForm({ defaultEmail, hasError }: { defaultEmail: string; hasError: boolean }) {
  const [email, setEmail] = useState(defaultEmail)
  const [remember, setRemember] = useState(true)

  // On load: if no email came from a failed attempt, prefill the remembered one
  useEffect(() => {
    const saved = localStorage.getItem('rememberEmail')
    if (!defaultEmail && saved) { setEmail(saved); setRemember(true) }
    else if (saved === null && !defaultEmail) setRemember(true)
  }, [defaultEmail])

  // Persist (or clear) on submit, before the server action runs
  function persist() {
    if (remember && email) localStorage.setItem('rememberEmail', email)
    else localStorage.removeItem('rememberEmail')
  }

  return (
    <form className="flex flex-col space-y-4" onSubmit={persist}>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
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

      <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
        <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} className="accent-primary" />
        Remember email
      </label>

      {hasError && (
        <p className="text-sm text-red-500 text-center -mb-2">Invalid email or password.</p>
      )}

      <LoginButton />

      <Link href="/forgot-password" className="text-sm text-center text-muted-foreground hover:text-foreground transition-colors">
        Forgot password?
      </Link>
    </form>
  )
}
