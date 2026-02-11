import { ReactNode } from 'react'
import './globals.css'
import Providers from '@/components/Providers'

export const metadata = {
  title: 'RetainIQ — Revenue Recovery for B2B Wholesalers',
  description: 'Detect lost products, find competitor losses, and get a daily call list to win revenue back.',
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
