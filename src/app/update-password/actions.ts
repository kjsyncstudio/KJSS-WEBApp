'use server'

import { redirect } from 'next/navigation'
import { isRedirectError } from 'next/dist/client/components/redirect-error'
import { createClient } from '@/utils/supabase/server'

export async function updatePassword(formData: FormData) {
  try {
    const supabase = await createClient()
    const password = formData.get('password') as string

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      redirect('/update-password?error=true')
    }

    redirect('/dashboard')
  } catch (err) {
    if (isRedirectError(err)) throw err
    redirect('/update-password?error=true')
  }
}
