import React from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getServerSupabase } from '../../../lib/supabaseClient';
// server-side DOM sanitization. Ensure `isomorphic-dompurify` is installed for server builds.
// TODO: add `isomorphic-dompurify` to package.json if not present.
import DOMPurify from 'isomorphic-dompurify';
import ArticleLayout from '../../../components/blog/ArticleLayout';
import ProductRecommendations from '../../../components/blog/ProductRecommendations';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const supabase = getServerSupabase();
  const { data } = await supabase.from('posts').select('title, excerpt, cover_image').eq('slug', slug).single();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
  if (!data) return { title: 'Post', description: '' };

  const image = data.cover_image
    ? data.cover_image.startsWith('http')
      ? data.cover_image
      : `${siteUrl}/api/og?img=${encodeURIComponent(data.cover_image)}`
    : undefined;

  return {
    title: `${data.title}`,
    description: data.excerpt || '',
    openGraph: {
      title: data.title,
      description: data.excerpt,
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
    },
  } as any;
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = getServerSupabase();

  const { data: post, error } = await supabase
    .from('posts')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (error || !post) {
    notFound();
  }

  // Sanitize server-side. TODO: Prefer storing sanitized MDX in DB in future.
  const clean = DOMPurify.sanitize((post.content as unknown as string) || '');

  return (
    <ArticleLayout post={post}>
      <article className="prose max-w-none">
        <div dangerouslySetInnerHTML={{ __html: clean }} />
      </article>

      <React.Suspense fallback={<div className="mt-8">Loading recommendations…</div>}>
        {/* ProductRecommendations is a server component placeholder */}
        <ProductRecommendations postId={post.id} />
      </React.Suspense>
    </ArticleLayout>
  );
}
