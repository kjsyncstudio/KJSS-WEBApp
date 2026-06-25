# KJ Sync Studio — User & Admin Guide

Project & client management app. Next.js 16 + Supabase. Hosted on Vercel.

## Roles
- **Admin** — full access: all projects/clients, admin panel, permissions, project settings, deleted bin.
- **Project Manager** (formerly "contractor") — sees & edits only the clients granted to them (per-client read/write). Cannot create projects.
- **Guest** — view-only. Sees only projects flagged guest-viewable.
- **Anonymous (link visitor)** — no account. Can open a guest-viewable project via direct link, read-only (thumbnail, title, description only).

First-ever signup becomes admin automatically; everyone else defaults to guest.

## Projects
- **List views** — card / list / compact (toggle top-right, remembered per browser).
- **Search** — filters by title, client, description, type.
- **Status filter pills** — All / Active / Pending / Expedite / Completed. Hover 2s for a description tooltip.
- **Sort** — Date or Name, click to flip ascending/descending. Latest first by default.
- **Hide completed** — on by default; toggle to show.
- **Select mode** — click "Select", then pick rows for bulk change (type/client/date) or delete.
- **Statuses**: Active (on-going) · Pending (waiting) · Expedite (urgent, shown amber) · Completed. Managed in Admin → Project Settings.
- **Delete = soft delete** — goes to Admin → Deleted bin; admins restore or permanently remove.

### Add projects
- **Add Project** — single modal.
- **Batch Add** — multiple rows; duplicate last row; CSV/JSON import.
  - CSV columns: `title, client_name, type, status, project_date, description`.
  - Import errors (unknown client / bad status) resolve one-by-one; choices remembered for repeats. Skip / Skip rest available.
  - **Clean Up** per row: pulls a year+month and a known client name out of the title, sets the date (1st of month) + client, strips them from the title.

## Project detail page
- **Title / Type / Date** — double-click to edit inline. Type opens a dropdown; date opens a picker.
- **Description** — double-click to edit; saves on blur.
- **Thumbnail** — upload (managers only).
- **Notes** — rich text. Ctrl/Cmd+B / I / U for bold / italic / underline. Autosaves.
- **Project Sheet** — spreadsheet (see below).
- **Download Links / Final URLs** — add/remove reference links.
- **Guest toggle** (admin) — makes the project publicly viewable by link.
- **Undo** — up to 20 steps across the page (notes, description, sheet cells, title/type/date). Floating Undo button bottom-right, or Ctrl+Z when not typing in a field. Forgotten when you leave the page.

### Spreadsheet shortcuts (Excel/Sheets-like)
- Click a cell to select; **arrow keys** move.
- **Drag** or **Shift+arrows** to select a range.
- **Ctrl/Cmd+C** copies the selection — paste straight into Excel or Google Sheets.
- **Type** or **Enter** to edit; **Shift/Ctrl+Enter** = new line inside the cell; **Enter** confirms + moves down; **Tab** confirms + right; **Esc** cancels.
- **Delete/Backspace** clears the selected cells.
- Hover a row number → **✕** deletes that row.
- Max 5 columns. Cells lock live while another person edits (presence).

### Live collaboration
Edits to notes, description, and the sheet broadcast in real time to anyone else viewing (Supabase Realtime — no Vercel cost). The field someone is actively editing is locked for others.

## Admin panel (admin only)
Tabs:
- **Members** — invite users, change roles, remove. Recent Activity log below (All / Changes filter).
- **Permissions** — grant a user read/write on a specific client. Project managers only see/edit their granted clients.
- **Unresolved Projects** — projects missing a client or a valid status; resolve inline.
- **Project Settings** — add / rename / delete statuses & types (renames cascade to projects).
- **Deleted** — soft-deleted projects; restore or delete forever. Shows who deleted each.

### Activity log
- **Status change** → "status: A → B".
- **Field edits** within a project collapse into one rolling entry per user per 30 min: "Notes modified, Description modified, …".

## Clients
- Card / list / compact views (remembered), search, sort by name/industry/years (double-click flips direction).
- Logo: URL field + upload icon. Priority: uploaded file → URL → placeholder. Uploads go to the separate `client-logos` bucket.

## Guest sharing
1. Open a project, admin flips the **guest** toggle on.
2. Share the project URL.
3. Anyone opens it without an account — read-only, internal sections (notes/sheet/links) hidden and DB-blocked.

## Setup / migrations
SQL migrations live in `supabase/migrations/` — run them in the Supabase SQL editor (no CLI link). Buckets to create (public): `images` (project thumbnails), `client-logos`.

Emails (reset / invite) use Supabase's default templates until custom SMTP is configured (requires a sending domain). Branded HTML templates are ready to paste once SMTP is set up.

## Environment
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`.
