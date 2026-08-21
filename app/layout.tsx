import type { Metadata } from "next"
import { DM_Mono, Martian_Mono } from "next/font/google"

import { Toaster } from "@/components/ui/sonner"

import "./globals.css"

const display = Martian_Mono({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "700"],
})

const mono = DM_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
})

export const metadata: Metadata = {
  title: "DITHO — one-bit image press",
  description:
    "Upload a photo, crop it, and run it through Floyd-Steinberg error diffusion. Everything happens in your browser.",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`dark ${display.variable} ${mono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="grain relative flex min-h-full flex-col bg-background">
        {children}
        <Toaster position="bottom-right" />
      </body>
    </html>
  )
}
