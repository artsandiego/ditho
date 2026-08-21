export interface LoadedImage {
  /** Object URL - the caller owns it and must revoke it on reset. */
  url: string
  element: HTMLImageElement
  width: number
  height: number
  name: string
}

const ACCEPTED = /^image\//

/**
 * Turn a picked File into a decoded image, or throw a message worth showing.
 * The type check is not enough on its own: Safari reports HEIC as an image and
 * every other browser then fails to decode it, so we wait for the decode.
 */
export async function loadImageFile(file: File): Promise<LoadedImage> {
  if (!ACCEPTED.test(file.type)) {
    throw new Error(`${file.name || "That file"} is not an image.`)
  }

  const url = URL.createObjectURL(file)
  const element = new Image()
  element.src = url

  try {
    await element.decode()
  } catch {
    URL.revokeObjectURL(url)
    throw new Error(
      `Could not read ${file.name || "that image"}. HEIC files need to be exported as JPEG or PNG first.`,
    )
  }

  return {
    url,
    element,
    width: element.naturalWidth,
    height: element.naturalHeight,
    name: file.name,
  }
}
