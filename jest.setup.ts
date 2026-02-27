import '@testing-library/jest-dom'

// Polyfill TextEncoder/TextDecoder (needed for streaming + DOMPurify in jsdom)
import { TextEncoder, TextDecoder } from 'util'
// @ts-ignore
if (typeof global.TextEncoder === 'undefined') (global as any).TextEncoder = TextEncoder
// @ts-ignore
if (typeof global.TextDecoder === 'undefined') (global as any).TextDecoder = TextDecoder

// Polyfill ReadableStream for jsdom — available natively in Node 18+ stream/web
if (typeof global.ReadableStream === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { ReadableStream } = require('stream/web') as typeof import('stream/web')
  ;(global as any).ReadableStream = ReadableStream
}
