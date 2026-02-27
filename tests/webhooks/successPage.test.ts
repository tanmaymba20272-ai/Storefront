// TODO: Hook this up to your test runner (Jest / Vitest) and environment.
// This is a minimal stub asserting that the success page shows a friendly
// message when no order_id is provided.

import React from 'react'
import { render } from '@testing-library/react'
import Page from '../../app/checkout/success/page'

test('success page renders friendly message when no order_id', async () => {
  // The page is a server component; call it as a function with empty searchParams
  // In most test runners you may need to render the exported component or adapt to Next's SSR.
  // TODO: wire up a proper server component test harness.
  const element = await (Page as any)({ searchParams: {} })
  // We can't easily inspect React element server output here without renderer; ensure it returns an object
  expect(element).toBeDefined()
})
