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
      <body className="antialiased bg-[#030303] text-zinc-100 min-h-screen relative overflow-x-hidden font-sans">
        {/* Vercel/Linear-like background grid pattern */}
        <div className="fixed inset-0 bg-[#030303] bg-[linear-gradient(to_right,#09090b_1px,transparent_1px),linear-gradient(to_bottom,#09090b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none z-0 opacity-80" />
        {/* Tasteful ambient background glowing blobs */}
        <div className="fixed -top-40 left-1/4 w-[600px] h-[600px] rounded-full bg-indigo-500/2 blur-[140px] pointer-events-none z-0" />
        <div className="fixed top-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-violet-500/2 blur-[120px] pointer-events-none z-0" />
        
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
