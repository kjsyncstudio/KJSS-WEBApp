import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Header from '@/components/header'
import Link from 'next/link'
import { TextPad } from './text-pad'
import { ExcelGrid } from './excel-grid'
import { ProjectLinks } from './project-links'
import { GuestToggle } from './guest-toggle'
import { ProjectThumbnail } from './project-thumbnail'
import { ProjectDescription } from './project-description'
import { ProjectLiveProvider } from './project-live'
import { ProjectHeader } from './project-header'

export default async function ProjectDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { id } = await params

  // Fetch the project details (RLS lets anon read only guest-viewable projects)
  const { data: project } = await supabase
    .from('projects')
    .select(`
      *,
      clients ( name )
    `)
    .eq('id', id)
    .single()

  // Anonymous visitors: allow only guest-viewable projects, otherwise send to login
  if (!user && !project?.guest_viewable) {
    redirect('/login')
  }

  // Fetch Notes (Text Pad)
  const { data: textNote } = await supabase
    .from('project_text_notes')
    .select('content')
    .eq('project_id', id)
    .single()

  // Fetch Grid Columns
  const { data: gridColumns } = await supabase
    .from('project_grid_columns')
    .select('*')
    .eq('project_id', id)
    .order('col_index')

  // Fetch Grid Cells
  const { data: gridCells } = await supabase
    .from('project_grid_cells')
    .select('*')
    .eq('project_id', id)

  // Fetch Upload Links
  const { data: uploadLinks } = await supabase
    .from('project_upload_links')
    .select('*')
    .eq('project_id', id)
    .order('created_at')

  // Fetch Final URLs
  const { data: finalUrls } = await supabase
    .from('project_final_urls')
    .select('*')
    .eq('project_id', id)
    .order('created_at')

  // Editable project types
  const { data: typeSettings } = await supabase.from('project_settings').select('value').eq('kind', 'type').order('sort')
  const types = (typeSettings || []).map(s => s.value)

  // Fetch role only for signed-in users; anonymous guests are always read-only
  let isAdmin = false
  let canManage = false
  let role: string | undefined
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    role = profile?.role
    isAdmin = role === 'admin'
    canManage = isAdmin
    if (!isAdmin && project?.client_id) {
      const { data: perm } = await supabase
        .from('client_permissions')
        .select('can_write')
        .eq('user_id', user.id)
        .eq('client_id', project.client_id)
        .maybeSingle()
      canManage = !!perm?.can_write
    }
  }

  // Internal sections (notes, sheet, links) are hidden from guests (anon + guest role)
  const showInternal = !!user && role !== 'guest'

  if (!project) {
    return (
      <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8 flex flex-col items-center justify-center">
          <h2 className="text-2xl font-bold mb-4">Project Not Found</h2>
          <Link href="/projects" className="text-primary hover:underline">
            ← Back to Projects
          </Link>
        </main>
      </div>
    )
  }

  const statusColors: Record<string, string> = {
    Active: 'bg-green-500/10 text-green-500 border-green-500/20',
    Expedite: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
    Completed: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    Done: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    Pending: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20',
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/projects" className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 mb-4">
            ← Back to Projects
          </Link>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <ProjectHeader
              projectId={project.id}
              title={project.title}
              type={project.type}
              projectDate={project.project_date ?? null}
              clientName={project.clients?.name ?? '—'}
              canManage={canManage}
              types={types}
            />
            <div className="flex items-center gap-3">
              {isAdmin && (
                <GuestToggle projectId={project.id} guestViewable={project.guest_viewable ?? false} />
              )}
              <div className={`px-3 py-1 rounded-full text-sm font-semibold border ${statusColors[project.status] ?? statusColors.Pending}`}>
                {project.status}
              </div>
            </div>
          </div>
        </div>

        <ProjectLiveProvider projectId={project.id} userEmail={user?.email ?? `Guest-${Math.random().toString(36).slice(2, 7)}`}>
          <ProjectThumbnail
            projectId={project.id}
            thumbnailUrl={project.thumbnail_url ?? null}
            canManage={canManage}
          />

          <ProjectDescription
            projectId={project.id}
            initial={project.description || ''}
            canManage={canManage}
          />

          {/* Internal sections — hidden from guests (anon + guest role) */}
          {showInternal && (
            <>
              <TextPad
                projectId={project.id}
                initialContent={textNote?.content || ''}
                canManage={canManage}
              />

              <ExcelGrid
                projectId={project.id}
                initialColumns={gridColumns || []}
                initialCells={gridCells || []}
                canManage={canManage}
              />

              <ProjectLinks
                projectId={project.id}
                uploadLinks={uploadLinks || []}
                finalUrls={finalUrls || []}
                canManage={canManage}
              />
            </>
          )}
        </ProjectLiveProvider>
      </main>
    </div>
  )
}
