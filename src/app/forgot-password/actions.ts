'use server'

import { redirect } from 'next/navigation'
import { isRedirectError } from 'next/dist/client/components/redirect-error'
import { createClient } from '@/utils/supabase/server'

export async function resetPassword(formData: FormData) {
  try {
    const supabase = await createClient()
    const email = formData.get('email') as string
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://kjss-web-app.vercel.app'

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/auth/callback?next=/update-password`,
    })

    if (error) {
      redirect(`/forgot-password?error=true&msg=${encodeURIComponent(error.message)}`)
    }

    redirect('/forgot-password?sent=true')
  } catch (err) {
    if (isRedirectError(err)) throw err
    const msg = err instanceof Error ? err.message : String(err)
    redirect(`/forgot-password?error=true&msg=${encodeURIComponent(msg)}`)
  }
}
