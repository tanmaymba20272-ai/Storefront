import React from 'react';

type Props = {
  children: React.ReactNode;
  post: any;
};

export default function ArticleLayout({ children, post }: Props) {
  return (
    <main className="max-w-3xl mx-auto p-6">
      <header className="mb-6">
        <h1 className="text-4xl font-serif mb-2">{post.title}</h1>
        <p className="text-sm text-gray-500">{post.published_at ? new Date(post.published_at).toLocaleDateString() : ''}</p>
      </header>

      <section className="prose prose-lg">
        <div className="first-letter:text-6xl first-letter:font-serif first-letter:float-left first-letter:mr-3 first-letter:leading-none">
          {children}
        </div>
      </section>
    </main>
  );
}
