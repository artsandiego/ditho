export interface LoadedImage {
  /** Object URL - the caller owns it and must revoke it on reset. */
  url: string
  element: HTMLImageElement
  width: number
  height: number
  name: string
}

const ACCEPTED = /^image\//
const LOAD_TIMEOUT_MS = 20_000

/**
 * Turn a picked File into a decoded image, or throw a message worth showing.
 *
 * Uses load/error rather than `decode()`: a detached image's decode can be
 * deferred indefinitely while the tab is hidden, which would leave the upload
 * stuck on "Reading…" for anyone who switches away mid-drop. The load event
 * fires regardless, and still tells us what we need — a format the browser
 * cannot handle fails rather than loading.
 *
 * The type check alone is not enough: Safari reports HEIC as an image and every
 * other browser then fails to decode it.
 */
export async function loadImageFile(file: File): Promise<LoadedImage> {
  if (!ACCEPTED.test(file.type)) {
    throw new Error(`${file.name || "That file"} is not an image.`)
  }

  const url = URL.createObjectURL(file)
  const element = new Image()

  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error("timeout")),
        LOAD_TIMEOUT_MS,
      )
      const settle = (fn: () => void) => () => {
        clearTimeout(timer)
        fn()
      }

      element.onload = settle(resolve)
      element.onerror = settle(() => reject(new Error("decode")))
      element.src = url
    })
  } catch {
    URL.revokeObjectURL(url)
    throw new Error(
      `Could not read ${file.name || "that image"}. HEIC files need to be exported as JPEG or PNG first.`,
    )
  }

  if (!element.naturalWidth || !element.naturalHeight) {
    URL.revokeObjectURL(url)
    throw new Error(`${file.name || "That image"} has no readable pixels.`)
  }

  return {
    url,
    element,
    width: element.naturalWidth,
    height: element.naturalHeight,
    name: file.name,
  }
}
