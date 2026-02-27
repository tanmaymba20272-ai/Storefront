import { z } from 'zod'

export const ShippingSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  line1: z.string().min(3, 'Address line 1 must be at least 3 characters'),
  city: z.string().min(2, 'City must be at least 2 characters'),
  state: z.string().min(2, 'State must be at least 2 characters'),
  pincode: z.string().regex(/^\d{6}$/, 'Pincode must be 6 digits'),
  phone: z.string().regex(/^\d{10}$/, 'Phone must be 10 digits'),
  country: z.string().default('IN'),
})

export type ShippingFormData = z.infer<typeof ShippingSchema>
