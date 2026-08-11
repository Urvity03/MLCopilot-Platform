import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'MLCopilot — AI Knowledge Operating System',
  description: 'Enterprise AI platform for document intelligence, semantic search, and RAG-powered conversations.',
  applicationName: 'MLCopilot',
  icons: {
    icon: [
      { url: '/mlcopilot-favicon-v2.png', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'dark light',
  themeColor: '#09090B',
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
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className={`${inter.className} antialiased bg-[var(--background)] text-[var(--foreground)] min-h-screen relative overflow-x-hidden`}>
        {/* Ambient grid pattern — subtle, like Linear */}
        <div className="fixed inset-0 ambient-grid [mask-image:radial-gradient(ellipse_80%_50%_at_50%_-20%,#000_70%,transparent_100%)] pointer-events-none z-0 opacity-60 dark:opacity-60 opacity-20" />
        
        {/* Ambient glow orbs */}
        <div className="fixed -top-[300px] left-1/3 w-[800px] h-[800px] rounded-full bg-[var(--primary)]/[0.03] blur-[150px] pointer-events-none z-0" />
        <div className="fixed top-1/3 -right-[200px] w-[600px] h-[600px] rounded-full bg-[#4F8CFF]/[0.02] blur-[130px] pointer-events-none z-0" />
        
        <div className="relative z-10 min-h-screen flex flex-col">
          <QueryProvider>
            <ThemeProvider>
              {children}
              <Toaster />
            </ThemeProvider>
          </QueryProvider>
        </div>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
