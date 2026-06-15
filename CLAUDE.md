@AGENTS.md

# KJS Studio

Project & client management web app for KJS. **Backend = internal management tool. Frontend = future public portfolio.**
Source of truth for the original plan: `../implementation_plan.md`.

## Stack
- **Next.js 16.2.9** (App Router) + **React 19.2** — NOTE: this Next.js has breaking changes vs older training data. Read `node_modules/next/dist/docs/` before writing Next code (see AGENTS.md).
- **Supabase** (`@supabase/ssr`) — Postgres + Auth + (intended) Realtime.
- **Tailwind CSS 4** (PostCSS plugin), **next-themes** dark/light, **lucide-react** icons.
- Hosting: **Vercel** — https://kjss-web-app.vercel.app. DB: **Supabase free tier**. GitHub: https://github.com/kjsyncstudio/KJSS-WEBApp (public).

## Run
```bash
cd kjs-studio
npm run dev      # localhost:3000
npm run build
npm run lint
```
Env in `kjs-studio/.env.local` (gitignored): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## Layout
- `src/app/` — routes: `login`, `dashboard`, `clients`, `projects`, `projects/[id]`. Server Actions live in `actions.ts` / `*-actions.ts` next to each route.
- `src/components/` — `header`, `theme-provider`, `theme-toggle`.
- `src/utils/supabase/` — `client.ts` (browser), `server.ts` (RSC/actions), `middleware.ts` (session refresh). `src/middleware.ts` runs it.
- `supabase/migrations/` — 5 SQL files (run manually in Supabase SQL editor; no Supabase CLI link yet).

## Data model (see migrations)
- `profiles` — mirrors `auth.users`; `role` = admin | contractor | guest. **First-ever user auto-becomes admin** (trigger `handle_new_user`); everyone else defaults to guest.
- `clients` — name, industry, year_start/end, logo_url. Admin-only writes.
- `projects` (+ `project_members`) — status enum Active/Done/Shelved/Pending, type, client_id, description. Admin full; contractor/guest see only assigned projects (via `project_members`).
- Notes: `project_text_notes` (1 per project), `project_grid_columns` (max 5), `project_grid_cells`, `project_notes_history`.
- Links: `project_upload_links`, `project_final_urls`.
- All tables have **RLS policies** — admin writes / contractor+admin edit notes / authenticated reads.

## RBAC rule of thumb
`canManage = role === 'admin' || role === 'contractor'`. Guests are read-only.

## Status — built vs missing (as of 2026-06-15)
**Built:** auth + login, middleware session, RBAC via RLS, clients CRUD, projects CRUD + detail, text pad (debounced autosave), excel grid, project links, dark/light theme.

**Missing / incomplete — DO NOT assume these work:**
1. **Realtime is NOT wired.** Text pad only debounce-saves ("saved locally"); grid likewise. The `alter publication supabase_realtime ...` line in the notes migration must be run manually, and no component subscribes yet.
2. **"Register New User" button (dashboard) is dead** — no admin create-user Server Action and no signup page. Open question how users get provisioned.
3. **Dashboard stat cards are hardcoded `0`** — not querying counts.
4. **Logo = plain URL text field**, no Supabase Storage upload.
5. **Version history table exists but nothing writes to it.**
6. **No git repo / no GitHub / not deployed to Vercel.**
7. **Public portfolio (`/portfolio`, Phase 5) not started.**

## Conventions
- Server Actions are `'use server'`, colocated with routes, call `revalidatePath` after writes.
- Auth gate pattern: every protected page does `supabase.auth.getUser()` → `redirect('/login')` if absent, then fetches `profiles.role`.
- Glass UI: `.glass` utility class + Tailwind tokens (`bg-background`, `text-foreground`, `border-border/50`).

## Decisions (2026-06-15)
- **User provisioning:** admin creates users **in-app** (build admin-only Server Action; needs Supabase service-role key server-side). Self-signup NOT used.
- **Realtime:** NOT required for v1. Debounced autosave is enough. Wire Supabase Realtime later.
- Working mode: **Caveman** chat replies. On any doc-update request, update CLAUDE.md + `../implementation_plan.md` (roadmap) + other docs.
