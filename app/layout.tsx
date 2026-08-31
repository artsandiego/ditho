import { SpeedInsights } from "@vercel/speed-insights/next"
import type { Metadata, Viewport } from "next"
import { Geist } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"

import "./globals.css"

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
})

const TITLE = "Ditho | Yet another dithering app"
const DESCRIPTION =
  "Upload a photo, crop it, and run it through error diffusion, an ordered screen or a halftone. Everything happens in your browser."

const site =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL &&
    `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`) ||
  (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`) ||
  "http://localhost:3000"

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: "Ditho",
  icons: {
    icon: "/assets/ditho-fav.png",
    apple: "/assets/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "Ditho",
    statusBarStyle: "default",
  },
  other: { "apple-mobile-web-app-capable": "yes" },
  openGraph: {
    type: "website",
    siteName: "Ditho",
    title: TITLE,
    description: DESCRIPTION,
    images: [
      {
        url: "/assets/ditho-og.jpg",
        width: 1200,
        height: 630,
        alt: "Ditho — a photograph rendered as a one-bit dither",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/assets/ditho-og.jpg"],
  },
}

export const viewport: Viewport = {
  themeColor: "#f6f4ef",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="grain relative flex min-h-full flex-col bg-background">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          {children}
          <Toaster position="bottom-right" />
        </ThemeProvider>

        <SpeedInsights />
      </body>
    </html>
  )
}
