import { getActiveAndUpcomingDrops } from '../../lib/actions/catalog'
import DropCountdown from '../../components/DropCountdown'
import Link from 'next/link'

export default async function StorefrontPage() {
  const drops = await getActiveAndUpcomingDrops()
  const activeDrops = drops.filter((d) => d.status === 'active')

  return (
    <div className="min-h-screen bg-cream">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center gap-4 px-4 py-24 text-center">
        <h1 className="font-serif text-5xl text-navy md:text-7xl">
          Old Money.
        </h1>
        <p className="max-w-lg font-sans text-base text-stone">
          Timeless sustainable fashion, crafted for those who dress with intention.
        </p>
        <Link
          href="/shop"
          className="mt-4 rounded-full bg-navy px-8 py-3 font-sans text-sm font-medium text-cream transition-colors hover:bg-forest"
        >
          Explore the Collection
        </Link>
      </section>

      {/* Active Drops */}
      {activeDrops.length > 0 && (
        <section className="mx-auto max-w-screen-xl px-4 pb-16">
          <h2 className="mb-6 font-serif text-2xl text-navy">Active Drops</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activeDrops.map((drop) => (
              <div
                key={drop.id}
                className="flex flex-col justify-between gap-3 rounded-xl border border-gold/30 bg-ivory p-5"
              >
                <div>
                  <span className="inline-block rounded-full border border-gold px-2 py-0.5 font-sans text-xs font-medium text-gold">
                    Live Drop
                  </span>
                  <h3 className="mt-2 font-serif text-lg text-navy">{drop.name}</h3>
                </div>
                {drop.end_at && (
                  <div className="flex items-center gap-2 font-sans text-sm text-stone">
                    <span>Ends in</span>
                    <DropCountdown endsAt={drop.end_at} />
                  </div>
                )}
                <Link
                  href={`/shop?drop=${drop.id}`}
                  className="text-sm font-medium text-forest underline-offset-2 hover:underline"
                >
                  Shop this drop →
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
