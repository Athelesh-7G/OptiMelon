import React from "react"
import type { Metadata } from 'next'

import { Analytics } from '@vercel/analytics/next'
import './globals.css'

import { Poppins as V0_Font_Poppins, Geist_Mono as V0_Font_Geist_Mono, Vollkorn as V0_Font_Vollkorn } from 'next/font/google'
import { ThemeProvider } from "@/components/theme-provider"

// Initialize fonts
const _poppins = V0_Font_Poppins({ subsets: ['latin'], weight: ["100","200","300","400","500","600","700","800","900"] })
const _geistMono = V0_Font_Geist_Mono({ subsets: ['latin'], weight: ["100","200","300","400","500","600","700","800","900"] })
const _vollkorn = V0_Font_Vollkorn({ subsets: ['latin'], weight: ["400","500","600","700","800","900"] })

export const metadata: Metadata = {
  title: 'OptiMelon - The Unified AI Studio',
  description: 'A clean, provider-agnostic LLM chat interface designed for productive technical work.',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
