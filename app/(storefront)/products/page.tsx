import React from 'react'
import getServerSupabase from '../../../lib/supabaseClient'
import ProductCard from '../../../components/ProductCard'

type ProductListItem = {
  id: string
  name: string
  slug: string
  price_cents: number
  image?: string | null
  drop_active?: boolean | null
}

export default async function ProductsPage() {
  const supabase = getServerSupabase
  const { data: products } = await supabase.from('products').select('id,name,slug,price_cents,image,drop_active') as unknown as { data: ProductListItem[] | null }

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">Products</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {Array.isArray(products) ? products.map((p) => <ProductCard key={p.id} product={p} />) : <div>No products</div>}
      </div>
    </main>
  )
}
