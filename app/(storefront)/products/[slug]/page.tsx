import { redirect } from 'next/navigation'

export default function ProductDetailRedirect({ params }: { params: { slug: string } }) {
  redirect(`/shop/${params.slug}`)
}

