# Webhook Test: Signature Forgery

This example demonstrates sending a webhook payload with an invalid signature and the expected 400 response.

Replace `https://your-app.example.com/api/webhooks/razorpay` with your local/dev URL.

1. Save a sample payload to `payload.json`:

```json
{
  "event": "payment.captured",
  "payload": {
    "payment": { "entity": { "order_id": "order_TEST_1" } }
  }
}
```

2. Compute an HMAC (example of a valid signature using `correct_secret`):

```bash
echo -n "$(cat payload.json)" | openssl dgst -sha256 -hmac "correct_secret" -hex
# Output will look like: (stdin)= ab12cd...ef
```

3. Example curl showing an INVALID signature header (forgery):

```bash
curl -X POST https://your-app.example.com/api/webhooks/razorpay \
  -H "Content-Type: application/json" \
  -H "x-razorpay-signature: deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef" \
  --data-binary @payload.json -v

# Expected response: HTTP/1.1 400 with JSON { "error": "invalid_signature" } or similar
```

4. To test a valid signature locally, compute hex HMAC as in step 2 and use that value in the `x-razorpay-signature` header.

Alternatively compute a valid hex HMAC via Node.js:

```bash
node -e "const crypto=require('crypto'),payload=require('fs').readFileSync('payload.json');console.log(crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET||'correct_secret').update(payload).digest('hex'))"
```
