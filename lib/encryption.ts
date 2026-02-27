/*
 * Server-only encryption utilities for storing sensitive settings.
 * - AES-GCM 256
 * - Uses Web Crypto (`globalThis.crypto.subtle`) when available (Edge/modern Node),
 *   otherwise falls back to Node's `crypto` module.
 *
 * Environment:
 * - Requires `SETTINGS_ENCRYPTION_KEY` env var. Accepts base64 or hex encoded
 *   32-byte key (AES-256). If missing, functions throw a clear error.
 *
 * Output format: base64(IV (12 bytes) || ciphertext || authTag (if node appended)).
 * For WebCrypto the returned ciphertext already contains the GCM tag appended.
 *
 * Rotation notes:
 * - To rotate keys, keep previous ciphertexts' metadata (e.g. `key_id`) in
 *   `store_settings` and re-encrypt values with a new key using a background job.
 */

const KEY_ENV_NAME = 'SETTINGS_ENCRYPTION_KEY';

function isHex(s: string) {
  return /^[0-9a-fA-F]+$/.test(s);
}

function base64ToUint8Array(b64: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(b64, 'base64'));
  }
  const bin = atob(b64);
  const len = bin.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function hexToUint8Array(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) throw new Error('Invalid hex string');
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return out;
}

async function getRawKeyBytes(): Promise<Uint8Array> {
  const v = process.env[KEY_ENV_NAME];
  if (!v) throw new Error(`${KEY_ENV_NAME} not set`);
  if (isHex(v) && v.length === 64) return hexToUint8Array(v);
  // otherwise try base64
  try {
    return base64ToUint8Array(v);
  } catch (e) {
    throw new Error(`${KEY_ENV_NAME} must be base64 or 32-byte hex`);
  }
}

export async function encryptSettings(value: string): Promise<string> {
  const raw = await getRawKeyBytes();
  // Prefer WebCrypto if available (Edge / modern Node)
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.subtle) {
    const subtle: SubtleCrypto = globalThis.crypto.subtle;
    const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
    const key = await subtle.importKey('raw', raw as unknown as Uint8Array<ArrayBuffer>, 'AES-GCM', false, ['encrypt']);
    const enc = new TextEncoder().encode(value);
    const cipherBuffer = await subtle.encrypt({ name: 'AES-GCM', iv }, key, enc);
    const combined = new Uint8Array(iv.length + cipherBuffer.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(cipherBuffer), iv.length);
    return uint8ArrayToBase64(combined);
  }

  // Node fallback
  const nodeCrypto = require('crypto') as typeof import('crypto');
  const iv = nodeCrypto.randomBytes(12);
  const cipher = nodeCrypto.createCipheriv('aes-256-gcm', Buffer.from(raw), Buffer.from(iv));
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  const out = Buffer.concat([Buffer.from(iv), ciphertext, tag]);
  return out.toString('base64');
}

export async function decryptSettings(ciphertextB64: string): Promise<string> {
  const raw = await getRawKeyBytes();
  const data = base64ToUint8Array(ciphertextB64);
  if (data.length < 12) throw new Error('Invalid ciphertext');
  const iv = data.slice(0, 12);
  const body = data.slice(12);

  if (typeof globalThis !== 'undefined' && globalThis.crypto?.subtle) {
    const subtle: SubtleCrypto = globalThis.crypto.subtle;
    const key = await subtle.importKey('raw', raw as unknown as Uint8Array<ArrayBuffer>, 'AES-GCM', false, ['decrypt']);
    // body contains ciphertext + tag (WebCrypto style)
    const plain = await subtle.decrypt({ name: 'AES-GCM', iv }, key, body);
    return new TextDecoder().decode(plain);
  }

  // Node fallback: last 16 bytes are auth tag
  const nodeCrypto = require('crypto') as typeof import('crypto');
  if (body.length < 16) throw new Error('Invalid ciphertext (too short for auth tag)');
  const tag = body.slice(body.length - 16);
  const ciphertext = body.slice(0, body.length - 16);
  const decipher = nodeCrypto.createDecipheriv('aes-256-gcm', Buffer.from(raw), Buffer.from(iv));
  decipher.setAuthTag(Buffer.from(tag));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(ciphertext)), decipher.final()]);
  return decrypted.toString('utf8');
}

export default { encryptSettings, decryptSettings };
