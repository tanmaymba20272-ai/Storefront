import { getServerSupabase } from '../lib/supabaseClient';
import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || '';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!SITE_URL) return [];

  const supabase = getServerSupabase();

  // Fetch published blog posts (table: posts)
  const { data: posts } = await supabase
    .from('posts')
    .select('slug, updated_at')
    .eq('status', 'published');

  // Fetch active & published products
  const { data: products } = await supabase
    .from('products')
    .select('handle, updated_at')
    .eq('published', true)
    .eq('active', true);

  const urls: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date() },
  ];

  if (posts && Array.isArray(posts)) {
    for (const p of posts) {
      if (!p?.slug) continue;
      urls.push({ url: `${SITE_URL}/blog/${p.slug}`, lastModified: p.updated_at ? new Date(p.updated_at) : new Date() });
    }
  }

  if (products && Array.isArray(products)) {
    for (const p of products) {
      if (!p?.handle) continue;
      urls.push({ url: `${SITE_URL}/product/${p.handle}`, lastModified: p.updated_at ? new Date(p.updated_at) : new Date() });
    }
  }

  return urls;
}