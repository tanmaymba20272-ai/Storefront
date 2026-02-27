import React from 'react'

type Props = React.InputHTMLAttributes<HTMLInputElement>

export default function Input(props: Props) {
  return <input className="border rounded-md px-3 py-2 w-full" {...props} />
}
