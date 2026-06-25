import { SkeletonHeader, Bar } from '@/components/skeleton'

export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SkeletonHeader />
      <main className="flex-1 container mx-auto px-4 py-8">
        <Bar className="h-8 w-56 mb-2" />
        <Bar className="h-4 w-72 mb-8" />
        <Bar className="h-16 w-full mb-8 rounded-2xl" />
        <div className="grid gap-6 md:grid-cols-3 mb-10">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass p-6 rounded-2xl border-border/50 space-y-3">
              <Bar className="h-3 w-24" /><Bar className="h-9 w-16" />
            </div>
          ))}
        </div>
        <Bar className="h-6 w-40 mb-4" />
        <div className="glass rounded-2xl border-border/50 divide-y divide-border/30">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="px-4 py-3"><Bar className="h-4 w-full" /></div>
          ))}
        </div>
      </main>
    </div>
  )
}
