'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { isRedirectError } from 'next/dist/client/components/redirect-error'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
  const email = formData.get('email') as string
  try {
    const supabase = await createClient()

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: formData.get('password') as string,
    })

    if (error) {
      redirect(`/login?error=true&email=${encodeURIComponent(email)}`)
    }

    revalidatePath('/', 'layout')
    redirect('/dashboard')
  } catch (err: unknown) {
    if (isRedirectError(err)) throw err
    redirect(`/login?error=true&email=${encodeURIComponent(email ?? '')}`)
  }
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/')
}
