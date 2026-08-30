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
  applicationName: "Ditho",
  icons: {
    icon: "/assets/ditho-fav.png",
    // iOS reads this tag rather than the manifest's icons when it saves a page
    // to the home screen, so the two have to be declared separately.
    apple: "/assets/apple-touch-icon.png",
  },
  // Named `Ditho` rather than the full title, which is what sits under the icon
  // on a home screen and is truncated at roughly twelve characters.
  // `default` for a light app, and deliberately not `black-translucent`: the
  // translucent bar overlays the page, and this layout is a fixed-height flex
  // column whose header would end up under the clock.
  appleWebApp: {
    capable: true,
    title: "Ditho",
    statusBarStyle: "default",
  },
  // `capable` above emits the standard `mobile-web-app-capable`, which iOS only
  // began honouring alongside the manifest's `display` in 16.4. The superseded
  // Apple spelling is what older iOS reads, and it costs one tag to keep those
  // devices launching without browser chrome.
  other: { "apple-mobile-web-app-capable": "yes" },
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

/**
 * Light outright, matching the manifest, so the browser chrome and the splash
 * screen do not flash dark around a light app on the way in.
 */
export const viewport: Viewport = {
  themeColor: "#f6f4ef",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="grain relative flex min-h-full flex-col bg-background">
        {/* No enableSystem: light is the default outright, not merely the
            fallback for anyone whose OS has not asked for dark. */}
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          {children}
          <Toaster position="bottom-right" />
        </ThemeProvider>

        {/* Core Web Vitals as real devices actually experience them. Worth having
            on this app in particular: all the work happens on the phone doing the
            looking, so the only honest numbers come from there. Reports nothing
            in development. */}
        <SpeedInsights />
      </body>
    </html>
  )
}
