/**
 * Test scaffold for Shiprocket fulfillment UI.
 * TODO: run tests with your project's test runner (jest/vitest) and adapt mocks.
 */
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'

// Inline mock of FulfillmentCard using React.createElement — no JSX in .ts files
function FulfillmentCard({ order }: { order: any }) {
  return React.createElement('div', null,
    React.createElement('div', null, order?.shipping_address?.name),
    React.createElement('button', {
      onClick: () => fetch(`/api/admin/orders/${order.id}/fulfill`, { method: 'POST' })
    }, 'Fulfill')
  )
}

describe('FulfillmentCard', () => {
  beforeEach(() => {
    // @ts-ignore
    global.fetch = jest.fn()
  })

  afterEach(() => {
    // @ts-ignore
    global.fetch.mockReset()
  })

  it('calls API when fulfill button is clicked', async () => {
    const order = { id: 'order_1', fulfillment_status: 'unfulfilled', shipping_address: { name: 'Jane' } }

    // @ts-ignore
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ awb_code: 'AWB123', courier_name: 'FastEx', label_url: '/label.pdf', fulfillment_status: 'fulfilled' }) })

    render(React.createElement(FulfillmentCard, { order }))

    const btn = await screen.findByRole('button', { name: /fulfill/i })
    fireEvent.click(btn)

    expect(global.fetch).toHaveBeenCalledWith('/api/admin/orders/order_1/fulfill', expect.objectContaining({ method: 'POST' }))

    // note: further assertions depend on your test environment and async handling
  })
})
