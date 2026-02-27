export default function OrdersPageSkeleton() {
  return (
    <div
      className="flex flex-col gap-4"
      aria-busy="true"
      aria-label="Loading your orders"
    >
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="animate-pulse border border-navy/10 bg-ivory p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-col gap-2">
              <div className="h-4 w-28 rounded bg-stone/20" />
              <div className="h-3 w-40 rounded bg-stone/15" />
            </div>
            <div className="flex items-center gap-3">
              <div className="h-4 w-20 rounded bg-stone/20" />
              <div className="h-5 w-14 rounded-full bg-stone/20" />
            </div>
            <div className="h-4 w-20 rounded bg-stone/15" />
          </div>
        </div>
      ))}
    </div>
  )
}
