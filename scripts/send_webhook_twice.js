// send_webhook_twice.js
// Usage: RAZORPAY_WEBHOOK_SECRET=your_secret WEBHOOK_URL=http://localhost:3000/api/webhooks/razorpay node send_webhook_twice.js

const https = require('https')
const http = require('http')
const crypto = require('crypto')
const fs = require('fs')

const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://localhost:3000/api/webhooks/razorpay'
const SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || 'test_secret'

const payload = {
  event: 'order.paid',
  payload: {
    order: {
      entity: {
        id: 'order_test_123',
        // -- replace with realistic structure
      }
    }
  }
}

const body = JSON.stringify(payload)
const sig = crypto.createHmac('sha256', SECRET).update(body).digest('hex')

function post(body, sig) {
  return new Promise((resolve, reject) => {
    const url = new URL(WEBHOOK_URL)
    const opts = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': sig,
        'Content-Length': Buffer.byteLength(body)
      }
    }
    const lib = url.protocol === 'https:' ? https : http
    const req = lib.request(url, opts, (res) => {
      let data = ''
      res.on('data', (d) => (data += d))
      res.on('end', () => resolve({ status: res.statusCode, body: data }))
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

;(async function main(){
  console.log('Posting webhook twice to', WEBHOOK_URL)
  const r1 = await post(body, sig)
  console.log('First response:', r1.status, r1.body)
  const r2 = await post(body, sig)
  console.log('Second response:', r2.status, r2.body)
})().catch(e=>{ console.error(e); process.exit(1) })
