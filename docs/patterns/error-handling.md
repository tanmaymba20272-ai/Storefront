# API Pattern: Standardized Responses

To ensure the frontend and backend communicate flawlessly, all Supabase Edge Functions and Next.js Route Handlers must return a standardized JSON structure.

## The Standard
```typescript
// Success Response
{
  success: true,
  data: { ... },
  message: "Optional success message"
}

// Error Response
{
  success: false,
  error: {
    code: "INVENTORY_EXHAUSTED", // Use ALL_CAPS string codes
    message: "This limited drop item is no longer available."
  }
}