import { z } from 'zod'

/**
 * Zod schema for creating or editing a Product.
 * Reflects the `products` table shape from `types/api.ts`.
 */
export const ProductSchema = z.object({
  /** Human-readable product name — minimum 2 characters. */
  name: z.string().min(2, 'Product name must be at least 2 characters'),

  /** Stock Keeping Unit identifier — must be non-empty. */
  sku: z.string().min(1, 'SKU is required'),

  /** Price in the smallest currency unit (e.g. paise / cents) — must be a positive integer. */
  price_cents: z
    .number()
    .int('Price must be a whole number (paise / cents)')
    .positive('Price must be greater than zero'),

  /** Available inventory — zero is allowed (sold-out state), negative is not. */
  inventory_count: z
    .number()
    .int('Inventory count must be a whole number')
    .min(0, 'Inventory count cannot be negative'),

  /** UUID of the parent category — must match UUID v4 format. */
  category_id: z
    .string()
    .uuid('category_id must be a valid UUID'),

  /** Optional short description shown on the storefront. */
  description: z.string().optional(),

  /** Optional URL pointing to the primary product image. */
  image: z.string().url('Image must be a valid URL').optional().or(z.literal('')),
})

export type ProductFormValues = z.infer<typeof ProductSchema>

/**
 * Subset used on the edit form — all fields optional except the discriminating ones.
 * Useful for PATCH-style updates where only changed fields are sent.
 */
export const ProductEditSchema = ProductSchema.partial().required({
  name: true,
  sku: true,
  price_cents: true,
  inventory_count: true,
  category_id: true,
})

export type ProductEditFormValues = z.infer<typeof ProductEditSchema>
