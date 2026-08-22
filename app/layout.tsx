import type { Metadata } from "next"
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

/**
 * Absolute base for the social tags, which cannot use relative paths.
 *
 * Read from Vercel's own variables rather than hardcoded, so preview and
 * production each advertise themselves rather than pointing at each other. The
 * production domain is preferred over the per-deployment URL so a shared link
 * keeps working after the next deploy.
 */
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
  icons: { icon: "/assets/ditho-fav.png" },
  openGraph: {
    type: "website",
    siteName: "Ditho",
    title: TITLE,
    description: DESCRIPTION,
    images: [
      {
        url: "/assets/ditho-og.png",
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
    images: ["/assets/ditho-og.png"],
  },
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="grain relative flex min-h-full flex-col bg-background">
        {/* No enableSystem: dark is the default outright, not merely the
            fallback for anyone whose OS has not asked for light. */}
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
          {children}
          <Toaster position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  )
}
