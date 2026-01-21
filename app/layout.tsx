import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'bubob finance',
  description: 'Catat uang masuk & keluar bubob finance',

  applicationName: 'bubob finance',

  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'bubob finance',
  },

  themeColor: '#0b1c2d',

  manifest: '/manifest.webmanifest',

  icons: {
    apple: '/apple-touch-icon.png',
  },
}
export const viewport = {
  themeColor: '#0B1B33', // navy
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  )
}
