'use client'

import { useEffect, useRef, useState } from 'react'

const DESCRIPTIONS: Record<string, string> = {
  Active: 'Project is now on-going',
  Pending: 'Project is now waiting for decisions / waiting to start',
  Expedite: 'Need to add the "faster" juice',
  Completed: 'Done Done Done Done',
}

type Props = {
  options: string[]
  active: string
  onSelect: (status: string) => void
}

export function StatusPills({ options, active, onSelect }: Props) {
  const [openFor, setOpenFor] = useState<string | null>(null)
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (openTimer.current) clearTimeout(openTimer.current)
      if (closeTimer.current) clearTimeout(closeTimer.current)
    }
  }, [])

  const clearOpen = () => {
    if (openTimer.current) {
      clearTimeout(openTimer.current)
      openTimer.current = null
    }
  }
  const clearClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }

  const handleEnter = (status: string) => {
    clearClose()
    const hasDesc = !!DESCRIPTIONS[status]
    if (openFor !== null) {
      // sticky: swap content instantly
      clearOpen()
      setOpenFor(hasDesc ? status : null)
      return
    }
    if (!hasDesc) return
    clearOpen()
    openTimer.current = setTimeout(() => {
      setOpenFor(status)
      openTimer.current = null
    }, 2000)
  }

  const handleLeave = () => {
    clearOpen()
    clearClose()
    closeTimer.current = setTimeout(() => {
      setOpenFor(null)
      closeTimer.current = null
    }, 2000)
  }

  const handleClick = (status: string) => {
    clearOpen()
    clearClose()
    setOpenFor(null)
    onSelect(status)
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 flex-1">
      {options.map((status) => (
        <span key={status} className="relative">
          {openFor === status && DESCRIPTIONS[status] && (
            <span className="absolute z-50 bottom-full mb-2 left-0 whitespace-nowrap rounded-md bg-foreground text-background text-xs px-2.5 py-1.5 shadow-lg pointer-events-none animate-in fade-in">
              {DESCRIPTIONS[status]}
            </span>
          )}
          <button
            type="button"
            onMouseEnter={() => handleEnter(status)}
            onMouseLeave={handleLeave}
            onClick={() => handleClick(status)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              active === status ? 'bg-primary text-primary-foreground shadow-md' : 'bg-secondary/50 text-muted-foreground hover:bg-secondary'
            }`}
          >
            {status}
          </button>
        </span>
      ))}
    </div>
  )
}
