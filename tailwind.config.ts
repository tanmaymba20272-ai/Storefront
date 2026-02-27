import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx,js,jsx}',
    './components/**/*.{ts,tsx,js,jsx}',
    './pages/**/*.{ts,tsx,js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        cream:    '#F5F0E8',
        navy:     '#1B2A4A',
        forest:   '#2D4A3E',
        gold:     '#C9A84C',
        charcoal: '#2C2C2C',
        stone:    '#8A8278',
        ivory:    '#FAF7F2',
      },
      fontFamily: {
        serif: ["'Playfair Display'", 'Georgia', 'serif'],
        sans:  ["'Inter'", 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
