import { SkeletonHeader, Bar, CardGridSkeleton } from '@/components/skeleton'

export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SkeletonHeader />
      <main className="flex-1 container mx-auto px-4 py-8">
        <Bar className="h-8 w-40 mb-2" />
        <Bar className="h-4 w-64 mb-8" />
        <Bar className="h-10 w-full mb-4 rounded-lg" />
        <div className="flex gap-2 mb-6">
          <Bar className="h-8 w-16 rounded-full" /><Bar className="h-8 w-16 rounded-full" /><Bar className="h-8 w-20 rounded-full" />
        </div>
        <CardGridSkeleton count={6} />
      </main>
    </div>
  )
}
