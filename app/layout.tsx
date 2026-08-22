import type { Metadata } from "next"
import { Geist } from "next/font/google"

import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"

import "./globals.css"

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "DITHO",
  description:
    "Upload a photo, crop it, and run it through error diffusion, an ordered screen or a halftone. Everything happens in your browser.",
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
