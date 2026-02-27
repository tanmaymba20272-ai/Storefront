"use client"

import React, { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { supabase } from '../../lib/supabaseClient'

type Props = {
  productId: string
  open: boolean
  onClose: () => void
}

const schema = z.object({
  rating: z.number().min(1).max(5),
  body: z.string().max(2000).optional(),
})

type FormValues = z.infer<typeof schema>

export default function ReviewModal({ productId, open, onClose }: Props) {
  const { register, handleSubmit, setValue, watch, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { rating: 5, body: '' },
  })

  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const dialogRef = useRef<HTMLDivElement | null>(null)

  // Close on ESC + focus trap
  useEffect(() => {
    if (!open) return
    // Focus the dialog container when it opens
    dialogRef.current?.focus()

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      // Basic focus trap: keep Tab/Shift+Tab inside the dialog
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault()
            last?.focus()
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault()
            first?.focus()
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  useEffect(() => {
    return () => {
      previews.forEach((p) => URL.revokeObjectURL(p))
    }
  }, [previews])

  useEffect(() => {
    if (!open) {
      setError(null)
      setFiles([])
      setPreviews([])
    }
  }, [open])

  function onFiles(selected: FileList | null) {
    if (!selected) return
    const list = Array.from(selected)
    const newFiles: File[] = []
    const newPreviews: string[] = []

    for (const f of list) {
      const isImage = f.type.startsWith('image/')
      const isVideo = f.type.startsWith('video/')
      if (isImage && f.size > 5 * 1024 * 1024) {
        setError('Images must be <= 5MB')
        return
      }
      if (isVideo && f.size > 20 * 1024 * 1024) {
        setError('Videos must be <= 20MB')
        return
      }
      newFiles.push(f)
      newPreviews.push(URL.createObjectURL(f))
    }

    setFiles((s) => [...s, ...newFiles].slice(0, 10))
    setPreviews((s) => [...s, ...newPreviews].slice(0, 10))
    setError(null)
  }

  async function onSubmit(data: FormValues) {
    setError(null)
    setLoading(true)
    try {
      // Resolve the authenticated user's ID server-side via the Supabase client
      const { data: userData, error: authErr } = await supabase.auth.getUser()
      if (authErr || !userData?.user) {
        setError('You must be logged in to submit a review')
        setLoading(false)
        return
      }
      const userId = userData.user.id
      const mediaUrls: string[] = []

      for (const f of files) {
        const filename = `${Date.now()}-${f.name}`
        const path = `${userId}/${filename}`
        const { data, error: upErr } = await supabase.storage
          .from('review-media')
          .upload(path, f, { cacheControl: '3600', upsert: false })

        if (upErr) {
          console.error('upload error', upErr)
          throw upErr
        }

        // Construct public path — backend may expect bucket/path or signed url.
        mediaUrls.push(`review-media/${path}`)
      }

      // Call server-side API to insert the review
      const resp = await fetch('/api/reviews/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: productId, rating: data.rating, body: data.body, media_urls: mediaUrls }),
      })

      const json = await resp.json()
      if (!resp.ok) {
        setError(json?.error ?? 'Failed to submit review')
        setLoading(false)
        return
      }

      // success
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          aria-modal="true"
          role="dialog"
          aria-labelledby="review-modal-title"
        >
          <motion.div
            initial={{ y: 20, scale: 0.98 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 10, scale: 0.98 }}
            className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-lg"
            ref={dialogRef}
            // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
            tabIndex={-1}
          >
            <h2 id="review-modal-title" className="mb-4 text-lg font-semibold">Leave a Review</h2>

            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium">Rating</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setValue('rating', n)}
                      className={`text-2xl ${watch('rating') >= n ? 'text-gold' : 'text-stone-400'}`}
                      aria-label={`Rate ${n} out of 5 stars`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Review</label>
                <textarea {...register('body')} rows={4} className="w-full rounded border p-2" />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Media (images/videos)</label>
                {/* Drag zone / file selector — keyboard accessible */}
                <div
                  role="button"
                  tabIndex={0}
                  aria-label="Upload review media — images up to 5 MB, videos up to 20 MB. Press Enter or Space to open file picker."
                  className="cursor-pointer rounded border-2 border-dashed border-stone-300 px-4 py-6 text-center text-sm text-stone-500 hover:border-stone-400 focus:outline-none focus:ring-2 focus:ring-navy"
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      fileInputRef.current?.click()
                    }
                  }}
                >
                  Click or press Enter to select images / videos
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  className="sr-only"
                  onChange={(e) => onFiles(e.target.files)}
                />
                <div className="mt-2 flex gap-2 overflow-x-auto">
                  {previews.map((p, i) => (
                    <div key={p} className="relative w-24">
                      <img src={p} alt={`preview-${i}`} className="h-24 w-24 rounded object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          setFiles((s) => s.filter((_, idx) => idx !== i))
                          setPreviews((s) => s.filter((_, idx) => idx !== i))
                        }}
                        className="absolute right-1 top-1 rounded bg-white px-1 text-xs"
                        aria-label="Remove file"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {error && <div className="text-sm text-red-600">{error}</div>}

              <div className="flex justify-end gap-2">
                <button type="button" onClick={onClose} className="rounded border px-4 py-2">
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="rounded bg-navy px-4 py-2 text-white">
                  {loading ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
