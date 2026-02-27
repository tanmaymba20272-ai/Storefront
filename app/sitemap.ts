import { getServerSupabase } from '../lib/supabaseClient';
import type { NextRequest } from 'next/server';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || '';

export async function GET(_req: NextRequest) {
  if (!SITE_URL) {
    return new Response('NEXT_PUBLIC_SITE_URL is not set', { status: 500 });
  }

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

  const urls: { loc: string; lastmod?: string }[] = [];

  if (posts && Array.isArray(posts)) {
    for (const p of posts) {
      if (!p?.slug) continue;
      urls.push({ loc: `${SITE_URL}/blog/${p.slug}`, lastmod: p.updated_at ?? undefined });
    }
  }

  if (products && Array.isArray(products)) {
    for (const p of products) {
      if (!p?.handle) continue;
      urls.push({ loc: `${SITE_URL}/product/${p.handle}`, lastmod: p.updated_at ?? undefined });
    }
  }

  // base pages
  urls.unshift({ loc: SITE_URL, lastmod: new Date().toISOString() });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
    .map(u => {
      const lastmod = u.lastmod ? `<lastmod>${new Date(u.lastmod).toISOString()}</lastmod>` : '';
      return `<url><loc>${u.loc}</loc>${lastmod}</url>`;
    })
    .join('\n')}
</urlset>`;

  return new Response(xml, { headers: { 'Content-Type': 'application/xml' } });
}

// NOTE: If the project upgrades to a Next version that exports a `sitemap()` helper,
// adapt this implementation to return an array of `Url` objects (with `url` and `lastModified`).