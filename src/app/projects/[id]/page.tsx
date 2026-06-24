import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Header from '@/components/header'
import Link from 'next/link'
import { TextPad } from './text-pad'
import { ExcelGrid } from './excel-grid'
import { ProjectLinks } from './project-links'
import { GuestToggle } from './guest-toggle'

export default async function ProjectDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { id } = await params

  // Fetch the project details
  const { data: project } = await supabase
    .from('projects')
    .select(`
      *,
      clients ( name )
    `)
    .eq('id', id)
    .single()

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

  // Fetch Role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  
  const role = profile?.role
  const canManage = role === 'admin' || role === 'project_manager'
  const isAdmin = role === 'admin'

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

  const statusColors = {
    Active: 'bg-green-500/10 text-green-500 border-green-500/20',
    Done: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    Shelved: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
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
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-3xl font-bold tracking-tight mb-2">{project.title}</h2>
              <div className="flex items-center gap-3 text-muted-foreground">
                <span className="font-medium text-foreground">{project.clients?.name}</span>
                <span>•</span>
                <span>{project.type}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isAdmin && (
                <GuestToggle projectId={project.id} guestViewable={project.guest_viewable ?? false} />
              )}
              <div className={`px-3 py-1 rounded-full text-sm font-semibold border ${statusColors[project.status as keyof typeof statusColors]}`}>
                {project.status}
              </div>
            </div>
          </div>
        </div>

        <div className="glass p-8 rounded-2xl border-border/50 mb-8">
          <h3 className="text-lg font-semibold mb-2">Description</h3>
          <p className="text-muted-foreground whitespace-pre-wrap">
            {project.description || 'No description provided.'}
          </p>
        </div>

        <ProjectLinks 
          projectId={project.id}
          uploadLinks={uploadLinks || []}
          finalUrls={finalUrls || []}
          canManage={canManage}
        />

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
      </main>
    </div>
  )
}
