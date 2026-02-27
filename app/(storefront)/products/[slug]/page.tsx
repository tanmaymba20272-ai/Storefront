import React from 'react'
import getServerSupabase from '../../../../lib/supabaseClient'

import dynamic from 'next/dynamic'

const AddToCartButton = dynamic(() => import('../../../../components/products/AddToCartButton').catch(() => null), { ssr: false })

export default async function ProductDetail({ params }: { params: { slug: string } }) {
  const { slug } = params
  const supabase = getServerSupabase
  const { data } = await supabase.from('products').select('*').eq('slug', slug).limit(1).single()

  if (!data) return <main className="p-6">Product not found</main>

  return (
    <main className="p-6">
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-100 h-96 flex items-center justify-center">{data.image ? <img src={data.image} alt={data.name} className="object-cover h-full w-full" /> : 'No image'}</div>
        <div>
          <h1 className="text-2xl font-bold">{data.name}</h1>
          <div className="text-xl mt-2">${(data.price_cents / 100).toFixed(2)}</div>
          <p className="mt-4 text-gray-700">{data.description}</p>
          <div className="mt-6">
            {AddToCartButton ? <AddToCartButton product={data} /> : <button className="px-4 py-2 bg-black text-white rounded">Add to Cart</button>}
          </div>
        </div>
      </div>
    </main>
  )
}
