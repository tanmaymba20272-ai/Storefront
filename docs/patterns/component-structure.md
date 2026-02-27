# Frontend Pattern: Next.js App Router Component Standards

To maintain a fluid, blazingly fast UI, adhere strictly to these React standards.

## The Standard
1. **Server-First:** Every component is a React Server Component (RSC) by default. Do not use `"use client"` at the top of a page file.
2. **Push Interactivity Down:** Only use `"use client"` in small, leaf-node components that require state (`useState`, `Zustand`) or animations (`Framer Motion`).
3. **Streaming & Suspense:** Wrap all async data-fetching components in a `<Suspense>` boundary and provide a Shadcn `<Skeleton />` fallback.

## Example Architecture:
```tsx
// app/products/[id]/page.tsx (Server Component)
import { Suspense } from 'react';
import ProductDetails from './ProductDetails';
import ProductSkeleton from './ProductSkeleton';
import AddToCartButton from './AddToCartButton'; // This is a client component

export default function Page({ params }: { params: { id: string } }) {
  return (
    <div className="flex flex-col md:flex-row gap-8">
      <Suspense fallback={<ProductSkeleton />}>
        <ProductDetails id={params.id} />
      </Suspense>
      <AddToCartButton productId={params.id} />
    </div>
  );
}