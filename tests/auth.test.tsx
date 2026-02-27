// TODO: Configure Jest test runner before enabling these tests.
// Run: npm install --save-dev jest jest-environment-jsdom @testing-library/react @testing-library/jest-dom @types/jest
// Then add jest.config.ts and a jest.setup.ts that imports @testing-library/jest-dom.
// See docs/frontend_readme.md for details.

import React from 'react'
import { render, screen } from '@testing-library/react'
import LoginModal from '../components/auth/LoginModal'
import RegisterModal from '../components/auth/RegisterModal'

describe('Auth UI smoke tests', () => {
  it('renders LoginModal', () => {
    render(<LoginModal onClose={() => {}} />)
    expect(screen.getByText(/Log in/i)).toBeInTheDocument()
  })

  it('renders RegisterModal', () => {
    render(<RegisterModal onClose={() => {}} />)
    expect(screen.getByText(/Create account/i)).toBeInTheDocument()
  })
})

// TODO: add deeper tests with mocked Supabase client and navigation
