import type { Area, Point } from "react-easy-crop"

import type { LoadedImage } from "@/lib/image/load"

export interface CropState {
  crop: Point
  zoom: number
  aspect: number
  area: Area | null
}

export function initialCropState(image: LoadedImage): CropState {
  return {
    crop: { x: 0, y: 0 },
    zoom: 1,
    aspect: image.width / image.height,
    area: null,
  }
}
