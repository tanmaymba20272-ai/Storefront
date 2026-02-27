import ShopGridSkeleton from '../../../components/shop/ShopGridSkeleton'

export default function ShopLoading() {
  return (
    <div className="min-h-screen bg-cream">
      <div className="mx-auto max-w-screen-xl px-4 py-8">
        <div className="mb-6 h-10 w-24 animate-pulse rounded bg-stone/20" />
        <ShopGridSkeleton />
      </div>
    </div>
  )
}
