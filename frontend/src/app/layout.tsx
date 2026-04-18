import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'DevCareer Intelligence',
    template: '%s | DevCareer Intelligence',
  },
  description: 'Brutally honest developer skill audit',
  keywords: ['developer audit', 'github analysis', 'career intelligence', 'code quality', 'skill assessment'],
  authors: [{ name: 'DevCareer Intelligence' }],
  creator: 'DevCareer Intelligence',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    siteName: 'DevCareer Intelligence',
    title: 'DevCareer Intelligence',
    description: 'Brutally honest developer skill audit powered by AI code analysis',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DevCareer Intelligence',
    description: 'Brutally honest developer skill audit',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  )
}
