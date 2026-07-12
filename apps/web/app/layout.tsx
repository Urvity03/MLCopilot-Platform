import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'MLCopilot Platform',
  description: 'Production-grade AI & Machine Learning Platform',
  applicationName: 'MLCopilot',
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
}

import { ThemeProvider } from '../components/common/ThemeProvider'
import { QueryProvider } from '../components/common/QueryProvider'
import { Toaster } from '../components/ui/toast'

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark" style={{ colorScheme: 'dark' }}>
      <body className="antialiased bg-[#030303] text-zinc-100 min-h-screen">
        <QueryProvider>
          <ThemeProvider>
            {children}
            <Toaster />
          </ThemeProvider>
        </QueryProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
