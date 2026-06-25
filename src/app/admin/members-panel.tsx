'use client'

import { useState, useTransition } from 'react'
import { updateUserRole, deleteUser, inviteUser, updateUserName } from './actions'

type Profile = {
  id: string
  email: string
  full_name: string | null
  role: string
  created_at: string
}

const ROLES = ['admin', 'project_manager', 'guest'] as const
const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  project_manager: 'Project Manager',
  guest: 'Guest',
}

export function MembersPanel({ members }: { members: Profile[] }) {
  const [isPending, startTransition] = useTransition()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [editingName, setEditingName] = useState<string | null>(null)
  const [nameValue, setNameValue] = useState('')

  function saveName(userId: string) {
    setEditingName(null)
    startTransition(async () => {
      const res = await updateUserName(userId, nameValue.trim())
      setFeedback(res.error ? `Error: ${res.error}` : 'Name updated.')
      setTimeout(() => setFeedback(null), 3000)
    })
  }

  function handleRoleChange(userId: string, email: string, newRole: string) {
    startTransition(async () => {
      const res = await updateUserRole(userId, newRole, email)
      setFeedback(res.error ? `Error: ${res.error}` : 'Role updated.')
      setTimeout(() => setFeedback(null), 3000)
    })
  }

  function handleDelete(userId: string, email: string) {
    if (!confirm(`Delete user ${email}? This cannot be undone.`)) return
    startTransition(async () => {
      const res = await deleteUser(userId, email)
      setFeedback(res.error ? `Error: ${res.error}` : 'User deleted.')
      setTimeout(() => setFeedback(null), 3000)
    })
  }

  async function handleInvite(formData: FormData) {
    const res = await inviteUser(formData)
    setFeedback(res.error ? `Error: ${res.error}` : 'Invite sent.')
    setInviteOpen(false)
    setTimeout(() => setFeedback(null), 4000)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">Members</h3>
        <button
          onClick={() => setInviteOpen(true)}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          + Invite User
        </button>
      </div>

      {feedback && (
        <p className={`text-sm px-3 py-2 rounded-md ${feedback.startsWith('Error') ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
          {feedback}
        </p>
      )}

      {inviteOpen && (
        <div className="glass p-6 rounded-2xl border border-border/50 space-y-4">
          <h4 className="font-semibold">Invite New User</h4>
          <form action={handleInvite} className="space-y-3">
            <input name="full_name" placeholder="Full name" required className="w-full px-3 py-2 bg-background/50 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            <input name="email" type="email" placeholder="Email address" required className="w-full px-3 py-2 bg-background/50 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            <select name="role" required className="w-full px-3 py-2 bg-background/50 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
              {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
            <div className="flex gap-3">
              <button type="submit" className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors">
                Send Invite
              </button>
              <button type="button" onClick={() => setInviteOpen(false)} className="px-4 py-2 rounded-md text-sm font-medium border border-border hover:bg-muted/50 transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="glass rounded-2xl border border-border/50 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border/50 bg-muted/20">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Role</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Joined</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {members.map((m, i) => (
              <tr key={m.id} className={`border-b border-border/30 last:border-0 ${i % 2 === 0 ? '' : 'bg-muted/5'}`}>
                <td className="px-4 py-3 font-medium">
                  {editingName === m.id ? (
                    <input autoFocus value={nameValue} onChange={e => setNameValue(e.target.value)}
                      onBlur={() => saveName(m.id)}
                      onKeyDown={e => { if (e.key === 'Enter') saveName(m.id); if (e.key === 'Escape') setEditingName(null) }}
                      className="bg-background border border-border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  ) : (
                    <span onDoubleClick={() => { setEditingName(m.id); setNameValue(m.full_name || '') }}
                      className="cursor-text hover:text-primary" title="Double-click to rename">
                      {m.full_name || '—'}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{m.email}</td>
                <td className="px-4 py-3">
                  <select
                    defaultValue={m.role}
                    disabled={isPending}
                    onChange={e => handleRoleChange(m.id, m.email, e.target.value)}
                    className="bg-background/50 border border-border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                  </select>
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs">
                  {new Date(m.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleDelete(m.id, m.email)}
                    disabled={isPending}
                    className="text-red-500 hover:text-red-400 text-xs font-medium transition-colors"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
