import React from 'react';

export default async function ProductRecommendations({ postId }: { postId: number }) {
  // Placeholder server component: in future implement recommendation logic
  return (
    <aside className="mt-8 p-4 border rounded bg-white/60">
      <h3 className="font-semibold mb-2">Recommended products</h3>
      <p className="text-sm text-gray-600">Product recommendations will appear here (placeholder).</p>
    </aside>
  );
}
