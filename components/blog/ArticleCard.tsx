import React from 'react';
type Props = { post: any };

export default function ArticleCard({ post }: Props) {
  const cover = post?.cover_image
    ? post.cover_image.startsWith('http')
      ? post.cover_image
      : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/blog-media/${post.cover_image}`
    : undefined;

  return (
    <article className="bg-white/60 rounded-md overflow-hidden shadow-sm">
      {cover && (
        // TODO: If the bucket is private, use Supabase signed URLs server-side
        <img src={cover} alt={post.title} className="w-full h-48 object-cover" />
      )}
      <div className="p-4">
        <h2 className="font-serif text-xl mb-2">{post.title}</h2>
        <p className="text-sm text-muted-foreground mb-3">{post.excerpt}</p>
        <time className="text-xs text-gray-500">
          {post.published_at ? new Date(post.published_at).toLocaleDateString() : ''}
        </time>
      </div>
    </article>
  );
}
