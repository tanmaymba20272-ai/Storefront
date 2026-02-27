'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: 'easeOut' as const, delay },
  }),
}

export default function HeroSection() {
  return (
    <section aria-label="Hero" className="flex min-h-screen flex-col items-center justify-center bg-cream px-6 text-center">
      <motion.h1
        className="font-serif text-5xl text-navy md:text-7xl"
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        custom={0}
      >
        Wear Less, Mean More
      </motion.h1>

      <motion.p
        className="mt-6 max-w-xl font-sans text-lg text-charcoal md:text-xl"
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        custom={0.18}
      >
        Sustainable luxury for the considered wardrobe.
      </motion.p>

      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        custom={0.34}
      >
        <Link
          href="/shop"
          className="mt-10 inline-block rounded-none border border-navy bg-navy px-10 py-4 font-sans text-sm font-semibold uppercase tracking-widest text-ivory transition-colors duration-200 hover:bg-transparent hover:text-navy"
        >
          Shop Now
        </Link>
      </motion.div>
    </section>
  )
}
