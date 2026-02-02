import { ReactNode } from 'react'
import './globals.css'

export const metadata = {
  title: 'Churn Detection',
  description: 'AI-Powered Customer Churn Detection',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
