import { Suspense } from 'react'
import Link from 'next/link'
import HeroSection from '../../components/home/HeroSection'
import ProductCard from '../../components/ProductCard'
import DropCountdown from '../../components/DropCountdown'
import Skeleton from '../../components/ui/skeleton'
import { getPublishedProducts, getActiveAndUpcomingDrops } from '../../lib/actions/catalog'
import type { ProductListItem, DropListItem } from '../../lib/actions/catalog'

/* ─── New Arrivals ──────────────────────────────────────────── */

async function NewArrivalsGrid() {
  const products: ProductListItem[] = await getPublishedProducts({ limit: 4, sort: 'newest' })
  if (!products.length) {
    return (
      <p className="col-span-full py-8 text-center font-sans text-stone">
        New arrivals coming soon.
      </p>
    )
  }
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}

function NewArrivalsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-3">
          <Skeleton className="aspect-[3/4] w-full rounded-none" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      ))}
    </div>
  )
}

/* ─── Active Drops ──────────────────────────────────────────── */

async function ActiveDropsSection() {
  const drops: DropListItem[] = await getActiveAndUpcomingDrops()
  if (!drops.length) return null

  return (
    <section className="bg-ivory px-6 py-20">
      <div className="mx-auto max-w-screen-xl">
        <h2 className="mb-10 font-serif text-3xl text-navy md:text-4xl">Limited Drops</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {drops.map((drop) => (
            <div
              key={drop.id}
              className="flex flex-col gap-4 border border-navy/10 bg-cream p-8"
            >
              <h3 className="font-serif text-xl text-navy">{drop.name}</h3>
              {drop.end_at && <DropCountdown endsAt={drop.end_at} />}
              <Link
                href={`/shop?drop=${drop.id}`}
                aria-label={`Shop the ${drop.name} drop`}
                className="mt-2 inline-block border border-forest bg-forest px-6 py-3 text-center font-sans text-sm font-semibold uppercase tracking-widest text-ivory transition-colors duration-200 hover:bg-transparent hover:text-forest"
              >
                Shop the Drop
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─── Page ──────────────────────────────────────────────────── */

export default async function HomePage() {
  return (
    <main>

      {/* 1. Hero */}
      <HeroSection />

      {/* 2. Featured Products */}
      <section className="bg-ivory px-6 py-20">
        <div className="mx-auto max-w-screen-xl">
          <h2 className="mb-10 font-serif text-3xl text-navy md:text-4xl">New Arrivals</h2>
          <Suspense fallback={<NewArrivalsSkeleton />}>
            <NewArrivalsGrid />
          </Suspense>
        </div>
      </section>

      {/* 3. Active Drops */}
      <Suspense fallback={null}>
        <ActiveDropsSection />
      </Suspense>

      {/* 4. Brand manifesto strip */}
      <section className="bg-navy px-6 py-14 text-center">
        <p className="mx-auto max-w-2xl font-serif text-lg italic text-ivory md:text-2xl">
          &ldquo;We believe fashion should outlast trends — made to last, designed to matter.&rdquo;
        </p>
      </section>

      {/* 5. Footer CTA */}
      <section className="bg-cream px-6 py-20 text-center">
        <h2 className="font-serif text-3xl text-navy md:text-4xl">
          Explore the full collection
        </h2>
        <Link
          href="/shop"
          className="mt-8 inline-block border border-navy bg-navy px-10 py-4 font-sans text-sm font-semibold uppercase tracking-widest text-ivory transition-colors duration-200 hover:bg-transparent hover:text-navy"
        >
          Shop All
        </Link>
      </section>
    </main>
  )
}
