'use client'

import { useTransition } from 'react'
import { toggleGuestViewable } from './project-actions'

export function GuestToggle({ projectId, guestViewable }: { projectId: string; guestViewable: boolean }) {
  const [isPending, startTransition] = useTransition()

  return (
    <label className="flex items-center gap-3 cursor-pointer select-none">
      <span className="text-sm font-medium">Guest can view</span>
      <div className="relative">
        <input
          type="checkbox"
          className="sr-only"
          checked={guestViewable}
          disabled={isPending}
          onChange={() => startTransition(() => { toggleGuestViewable(projectId, !guestViewable) })}
        />
        <div className={`w-10 h-6 rounded-full transition-colors ${guestViewable ? 'bg-primary' : 'bg-muted'}`} />
        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${guestViewable ? 'translate-x-4' : ''}`} />
      </div>
    </label>
  )
}
