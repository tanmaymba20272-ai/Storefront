'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { AnimatePresence, motion } from 'framer-motion'

/** Minimal subset of framer-motion PanInfo used in this component. */
interface DragInfo {
  offset: { x: number; y: number }
}

interface ProductImageGalleryProps {
  images: string[]
  productName: string
}

export default function ProductImageGallery({
  images,
  productName,
}: ProductImageGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [direction, setDirection] = useState(0)

  function go(index: number) {
    setDirection(index > activeIndex ? 1 : -1)
    setActiveIndex(index)
  }

  function prev() {
    go(activeIndex === 0 ? images.length - 1 : activeIndex - 1)
  }

  function next() {
    go(activeIndex === images.length - 1 ? 0 : activeIndex + 1)
  }

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? '-100%' : '100%', opacity: 0 }),
  }

  return (
    <div className="flex flex-col gap-3 select-none">
      {/* Main image */}
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-cream">
        <AnimatePresence custom={direction} initial={false}>
          <motion.div
            key={activeIndex}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.35, ease: 'easeInOut' }}
            className="absolute inset-0"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.15}
            onDragEnd={(_e: MouseEvent | TouchEvent | PointerEvent, info: DragInfo) => {
              if (info.offset.x < -60) next()
              if (info.offset.x > 60) prev()
            }}
          >
            {images[activeIndex] ? (
              <Image
                src={images[activeIndex]}
                alt={`${productName} – image ${activeIndex + 1}`}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover pointer-events-none"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-stone text-sm">
                No image
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Arrow controls (visible on desktop) */}
        {images.length > 1 && (
          <>
            <button
              onClick={prev}
              aria-label="Previous image"
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-ivory/80 p-2 text-navy shadow hover:bg-ivory"
            >
              ‹
            </button>
            <button
              onClick={next}
              aria-label="Next image"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-ivory/80 p-2 text-navy shadow hover:bg-ivory"
            >
              ›
            </button>
          </>
        )}
      </div>

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((src, i) => (
            <button
              key={i}
              onClick={() => go(i)}
              aria-label={`View image ${i + 1}`}
              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-md border-2 transition-colors ${
                i === activeIndex ? 'border-navy' : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              <Image
                src={src}
                alt={`${productName} thumbnail ${i + 1}`}
                fill
                sizes="64px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
