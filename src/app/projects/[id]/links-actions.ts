'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { logProjectChange } from '@/utils/audit'

// Friendly provider name from a URL's host
function providerOf(url: string): string {
  try {
    const h = new URL(url).hostname.replace(/^www\./, '')
    if (/drive\.google|docs\.google/.test(h)) return 'Google Drive'
    if (/dropbox/.test(h)) return 'Dropbox'
    if (/youtube|youtu\.be/.test(h)) return 'YouTube'
    if (/instagram/.test(h)) return 'Instagram'
    if (/facebook|fb\./.test(h)) return 'Facebook'
    if (/tiktok/.test(h)) return 'TikTok'
    if (/vimeo/.test(h)) return 'Vimeo'
    if (/wetransfer/.test(h)) return 'WeTransfer'
    if (/frame\.io/.test(h)) return 'Frame.io'
    return h
  } catch { return 'Link' }
}

// Try to read the page <title>; fall back to the provider name
async function deriveTitle(url: string): Promise<string> {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 4000)
    const res = await fetch(url, { signal: ctrl.signal, redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0' } })
    clearTimeout(t)
    const html = await res.text()
    const m = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    const title = m?.[1]?.trim()
    if (title && title.length > 1) return title.slice(0, 120)
  } catch { /* ignore — fall through */ }
  return providerOf(url)
}

export async function addUploadLink(projectId: string, url: string) {
  if (!url?.trim()) return { error: 'URL required.' }
  const supabase = await createClient()
  const title = await deriveTitle(url)
  const { error } = await supabase.from('project_upload_links').insert({ project_id: projectId, title, url })
  if (error) return { error: error.message }
  await logProjectChange(projectId, 'link')
  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}

export async function updateUploadLink(projectId: string, linkId: string, url: string) {
  if (!url?.trim()) return { error: 'URL required.' }
  const supabase = await createClient()
  const title = await deriveTitle(url)
  const { error } = await supabase.from('project_upload_links').update({ url, title }).eq('id', linkId)
  if (error) return { error: error.message }
  await logProjectChange(projectId, 'link')
  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}

export async function deleteUploadLink(projectId: string, linkId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('project_upload_links').delete().eq('id', linkId)
  if (error) return { error: error.message }
  await logProjectChange(projectId, 'link')
  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}

export async function addFinalUrl(projectId: string, platform: string, url: string) {
  if (!url?.trim()) return { error: 'URL required.' }
  const supabase = await createClient()
  const { error } = await supabase.from('project_final_urls').insert({ project_id: projectId, platform: platform || providerOf(url), url })
  if (error) return { error: error.message }
  await logProjectChange(projectId, 'finalurl')
  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}

export async function deleteFinalUrl(projectId: string, urlId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('project_final_urls').delete().eq('id', urlId)
  if (error) return { error: error.message }
  await logProjectChange(projectId, 'finalurl')
  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}
