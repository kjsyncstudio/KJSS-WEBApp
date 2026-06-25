// Shared loading-skeleton primitives. Pulsing neutral blocks.
export function Bar({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted/70 ${className}`} />
}

export function SkeletonHeader() {
  return (
    <header className="border-b border-border bg-background h-16">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Bar className="h-9 w-9 rounded-lg" />
          <div className="hidden md:flex gap-4">
            <Bar className="h-4 w-16" /><Bar className="h-4 w-14" /><Bar className="h-4 w-16" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Bar className="h-7 w-24 rounded-full" /><Bar className="h-8 w-8 rounded-full" />
        </div>
      </div>
    </header>
  )
}

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass p-6 rounded-2xl border-border/50 space-y-3">
          <Bar className="h-5 w-2/3" /><Bar className="h-3 w-1/2" />
          <Bar className="h-3 w-full" /><Bar className="h-3 w-4/5" />
        </div>
      ))}
    </div>
  )
}
