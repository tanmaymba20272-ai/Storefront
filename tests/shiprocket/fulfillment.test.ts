/**
 * Test scaffold for Shiprocket fulfillment UI.
 * TODO: run tests with your project's test runner (jest/vitest) and adapt mocks.
 */
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import FulfillmentCard from '../../../components/admin/orders/FulfillmentCard'

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

    render(<FulfillmentCard order={order} />)

    const btn = await screen.findByRole('button', { name: /fulfill/i })
    fireEvent.click(btn)

    expect(global.fetch).toHaveBeenCalledWith('/api/admin/orders/order_1/fulfill', expect.objectContaining({ method: 'POST' }))

    // note: further assertions depend on your test environment and async handling
  })
})
