import type { MetadataRoute } from "next"

/**
 * What a phone reads when it installs the app.
 *
 * `display: "standalone"` is the point of the whole exercise: launched from the
 * home screen there is no address bar and no browser chrome, which on a phone is
 * roughly 100px of vertical space handed back to the photograph.
 *
 * Icons are declared `purpose: "any"` rather than `"maskable"`. The mark has
 * generous padding but its corners still fall outside the 80% safe circle a
 * maskable icon is cropped to, so claiming maskable would let Android clip them.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ditho — dithering, in your browser",
    short_name: "Ditho",
    description:
      "Upload a photo or a video, crop it, and run it through error diffusion, an ordered screen or a halftone. Everything happens on your device.",
    start_url: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#080807",
    theme_color: "#080807",
    categories: ["photo", "graphics", "utilities"],
    icons: [
      { src: "/assets/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/assets/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  }
}
