import path from 'path'
import type { NextConfig } from 'next'

const config: NextConfig = {
  // Pin workspace root to this project, suppressing the multi-lockfile warning
  outputFileTracingRoot: path.join(__dirname),
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: '*.supabase.in' },
    ],
  },
  serverExternalPackages: ['isomorphic-dompurify'],
}

export default config
