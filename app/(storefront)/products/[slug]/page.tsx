import { redirect } from 'next/navigation'

export default async function ProductDetailRedirect({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  redirect(`/shop/${slug}`)
}

