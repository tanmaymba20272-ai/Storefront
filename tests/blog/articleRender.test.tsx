import React from 'react';
import { render, screen } from '@testing-library/react';
import DOMPurify from 'isomorphic-dompurify';

function ServerSanitizedArticle({ html }: { html: string }) {
  const clean = DOMPurify.sanitize(html);
  return <div data-testid="article" dangerouslySetInnerHTML={{ __html: clean }} />;
}

test('sanitized HTML does not include script tags', () => {
  const malicious = '<p>Hi</p><script>window.evil=1</script>';
  const { container } = render(<ServerSanitizedArticle html={malicious} />);

  expect(container.querySelector('script')).toBeNull();
  expect(screen.getByTestId('article').textContent).toContain('Hi');
});
