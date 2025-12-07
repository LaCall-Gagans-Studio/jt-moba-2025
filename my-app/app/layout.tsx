import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'sonner' // Requires install, or custom. I'll use a simple custom one if sonner not installed. I'll install sonner.

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Airsoft MOBA',
  description: 'Realtime Territory Control',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        {children}
        {/* Simple mock toaster or empty for now if package missing */}
      </body>
    </html>
  )
}
