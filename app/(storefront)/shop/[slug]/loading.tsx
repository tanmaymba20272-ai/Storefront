import Skeleton from '../../../../components/ui/skeleton-component'

export default function ProductDetailLoading() {
  return (
    <div className="min-h-screen bg-cream">
      <div className="mx-auto max-w-screen-xl px-4 py-10">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
          {/* Image skeleton */}
          <Skeleton className="aspect-[4/5] w-full rounded-xl" />

          {/* Text skeletons */}
          <div className="flex flex-col gap-5 pt-4">
            <Skeleton className="h-9 w-3/4" />
            <Skeleton className="h-7 w-1/3" />
            <Skeleton className="h-4 w-1/4" />
            <div className="flex gap-2">
              <Skeleton className="h-10 w-16 rounded-full" />
              <Skeleton className="h-10 w-16 rounded-full" />
              <Skeleton className="h-10 w-16 rounded-full" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
            <Skeleton className="mt-4 h-12 w-full rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  )
}
