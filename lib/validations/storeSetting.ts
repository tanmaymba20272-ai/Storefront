import { z } from 'zod'

/**
 * Zod schema for inserting or updating a row in the `store_settings` table.
 * Reflects the `StoreSetting` interface in `types/api.ts`.
 *
 * Both `key` and `value` must be non-empty strings. The `key` is treated as a
 * unique identifier for the setting (e.g. `razorpay_key_id`, `maintenance_mode`).
 * The `value` is always stored as a string; callers must serialise complex values
 * (e.g. JSON) before writing and deserialise after reading.
 */
export const StoreSettingSchema = z.object({
  /** Unique identifier for this setting entry — must be non-empty. */
  key: z.string().min(1, 'Setting key is required'),

  /** Stored value — must be non-empty. Serialise complex types to JSON before writing. */
  value: z.string().min(1, 'Setting value is required'),
})

export type StoreSettingFormValues = z.infer<typeof StoreSettingSchema>
