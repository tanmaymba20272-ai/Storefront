import React from 'react'
import { render, screen } from '@testing-library/react'
import LoginModal from '../components/auth/LoginModal'
import RegisterModal from '../components/auth/RegisterModal'

describe('Auth UI smoke tests', () => {
  it('renders LoginModal', () => {
    render(<LoginModal onClose={() => {}} />)
    expect(screen.getByText(/Log in/i)).toBeTruthy()
  })

  it('renders RegisterModal', () => {
    render(<RegisterModal onClose={() => {}} />)
    expect(screen.getByRole('heading', { name: /Create account/i })).toBeTruthy()
  })
})
