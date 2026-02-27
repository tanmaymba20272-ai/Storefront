"use client"
import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

type Props = { endsAt: string }

export default function DropCountdown({ endsAt }: Props) {
  const [remaining, setRemaining] = useState(() => Math.max(0, new Date(endsAt).getTime() - Date.now()))

  useEffect(() => {
    const t = setInterval(() => setRemaining(Math.max(0, new Date(endsAt).getTime() - Date.now())), 1000)
    return () => clearInterval(t)
  }, [endsAt])

  const seconds = Math.floor(remaining / 1000) % 60
  const minutes = Math.floor(remaining / (1000 * 60)) % 60
  const hours = Math.floor(remaining / (1000 * 60 * 60)) % 24
  const days = Math.floor(remaining / (1000 * 60 * 60 * 24))

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="inline-flex items-center space-x-2">
      <div className="text-sm font-medium">{days}d {hours}h {minutes}m {seconds}s</div>
    </motion.div>
  )
}
