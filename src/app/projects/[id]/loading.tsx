import { SkeletonHeader, Bar } from '@/components/skeleton'

export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SkeletonHeader />
      <main className="flex-1 container mx-auto px-4 py-8">
        <Bar className="h-4 w-32 mb-6" />
        <Bar className="h-9 w-2/3 mb-2" />
        <Bar className="h-4 w-48 mb-8" />
        <Bar className="h-24 w-full mb-6 rounded-2xl" />
        <Bar className="h-32 w-full mb-8 rounded-2xl" />
        <Bar className="h-40 w-full mb-8 rounded-2xl" />
      </main>
    </div>
  )
}
