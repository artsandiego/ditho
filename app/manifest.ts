import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ditho — dithering, in your browser",
    short_name: "Ditho",
    description:
      "Upload a photo or a video, crop it, and run it through error diffusion, an ordered screen or a halftone. Everything happens on your device.",
    start_url: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#f6f4ef",
    theme_color: "#f6f4ef",
    categories: ["photo", "graphics", "utilities"],
    icons: [
      { src: "/assets/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/assets/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  }
}
