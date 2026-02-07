import { ReactNode } from 'react'
import './globals.css'
import Providers from '@/components/Providers'

export const metadata = {
  title: 'Churn Detection',
  description: 'AI-Powered Customer Churn Detection',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
