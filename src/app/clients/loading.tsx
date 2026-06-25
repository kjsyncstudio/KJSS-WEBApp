import { SkeletonHeader, Bar, CardGridSkeleton } from '@/components/skeleton'

export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SkeletonHeader />
      <main className="flex-1 container mx-auto px-4 py-8">
        <Bar className="h-8 w-32 mb-2" />
        <Bar className="h-4 w-56 mb-8" />
        <Bar className="h-10 w-full mb-4 rounded-lg" />
        <CardGridSkeleton count={6} />
      </main>
    </div>
  )
}
