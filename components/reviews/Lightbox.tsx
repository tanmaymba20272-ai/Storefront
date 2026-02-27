"use client"

import React, { useState } from 'react'
import { motion } from 'framer-motion'

const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.ogg', '.mov', '.m4v']

function isVideoSrc(src: string): boolean {
  // Strip query string before testing extension
  const clean = src.split('?')[0].toLowerCase()
  return VIDEO_EXTENSIONS.some((ext) => clean.endsWith(ext))
}

export default function Lightbox({ src, thumbsOnly }: { src: string; thumbsOnly?: boolean }) {
  const [open, setOpen] = useState(false)

  const isVideo = isVideoSrc(src)

  if (thumbsOnly) {
    return (
      <button onClick={() => setOpen(true)} className="overflow-hidden rounded">
        {!isVideo ? (
          // NOTE: src is expected to be a fully-qualified public or pre-signed URL resolved by ReviewCard.
          <img src={src} alt="review media" className="h-24 w-full object-cover" />
        ) : (
          <video
            src={src}
            className="h-24 w-full object-cover"
            playsInline
            preload="metadata"
            muted
          />
        )}
        {open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-h-full max-w-full">
              <button onClick={() => setOpen(false)} className="mb-4 rounded bg-white p-2">Close</button>
              {!isVideo ? (
                <img src={src} alt="full" className="max-h-[80vh] max-w-[90vw] object-contain" />
              ) : (
                <video
                  src={src}
                  controls
                  playsInline
                  preload="metadata"
                  className="max-h-[80vh] max-w-[90vw]"
                />
              )}
              <div className="mt-2 text-right">
                <a href={src} download className="rounded bg-white px-3 py-1 text-sm">Download</a>
              </div>
            </motion.div>
          </div>
        )}
      </button>
    )
  }

  return null
}
