import { Metadata } from 'next';
import ArticleCard from '../../components/blog/ArticleCard';
import { getServerSupabase } from 'lib/supabase/getServerSupabase';

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const site = process.env.NEXT_PUBLIC_SITE_TITLE || 'Storefront';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
  return {
    title: `${site} — Blog`,
    description: 'Latest updates and stories from our sustainable drops.',
    openGraph: {
      title: `${site} — Blog`,
      description: 'Latest updates and stories from our sustainable drops.',
      url: siteUrl ? `${siteUrl}/blog` : undefined,
    },
  };
}

export default async function BlogIndex() {
  const { supabase } = await getServerSupabase();

  const { data: posts, error } = await supabase
    .from('posts')
    .select('id, title, slug, excerpt, cover_image, published_at, updated_at')
    .eq('status', 'published')
    .order('published_at', { ascending: false });

  if (error) {
    console.error('Failed to load blog posts', error);
    return <div className="p-6">Unable to load posts.</div>;
  }

  return (
    <main className="max-w-5xl mx-auto p-6">
      <h1 className="text-3xl font-serif mb-6">Blog</h1>
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {posts?.map((post: any) => (
          <ArticleCard key={post.id} post={post} />
        ))}
      </section>
    </main>
  );
}
