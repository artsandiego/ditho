"use client"

import { Download, Plus, Share, X } from "lucide-react"
import { useState, useSyncExternalStore, type ReactNode } from "react"

import { Button } from "@/components/ui/button"

const DISMISSED = "ditho:install-dismissed"

/**
 * Chrome's install event. Not in lib.dom, because it is not standardised — and
 * that is precisely why Android can offer a button and iOS cannot.
 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

type Mode = "none" | "ios" | "prompt"

/** Installed already, whether the browser recorded it or iOS did. */
function isInstalled(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // Safari's own flag, and the only way to tell on iOS.
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

/** iPadOS reports itself as a Mac, so touch points are what separate the two. */
function isIOS(): boolean {
  const ua = window.navigator.userAgent
  return (
    /iphone|ipod|ipad/i.test(ua) ||
    (/macintosh/i.test(ua) && window.navigator.maxTouchPoints > 1)
  )
}

/**
 * Whether the app can be installed, as an external store.
 *
 * This is browser state, not React state: it depends on the user agent, on
 * whether the app is already installed, and on an event the browser fires when
 * it feels like it. Reading it through `useSyncExternalStore` keeps the server
 * render honest — it always says "none", so there is nothing to mismatch on
 * hydration — and avoids setting state from inside an effect to reach it.
 */
let mode: Mode = "none"
let deferred: BeforeInstallPromptEvent | null = null
let started = false
const listeners = new Set<() => void>()

const emit = () => listeners.forEach((notify) => notify())

function setMode(next: Mode) {
  if (mode === next) return
  mode = next
  emit()
}

function start() {
  if (started) return
  started = true

  if (isInstalled()) return
  try {
    if (window.localStorage.getItem(DISMISSED)) return
  } catch {
    // Private browsing can throw on read; not a reason to hide the offer.
  }

  if (isIOS()) setMode("ios")

  window.addEventListener("beforeinstallprompt", (event) => {
    // Held back so the offer appears inside the page, rather than as a bar the
    // browser draws over it.
    event.preventDefault()
    deferred = event as BeforeInstallPromptEvent
    setMode("prompt")
  })

  window.addEventListener("appinstalled", () => setMode("none"))
}

function subscribe(notify: () => void) {
  start()
  listeners.add(notify)
  return () => listeners.delete(notify)
}

function dismiss() {
  setMode("none")
  try {
    window.localStorage.setItem(DISMISSED, "1")
  } catch {
    // Nothing to do — it simply offers again next time.
  }
}

async function install() {
  const event = deferred
  if (!event) return
  await event.prompt()
  const { outcome } = await event.userChoice
  deferred = null
  if (outcome === "accepted") setMode("none")
}

function Step({ n, icon: Icon, children }: { n: number; icon: typeof Share; children: ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-border text-[11px] tabular-nums text-muted-foreground">
        {n}
      </span>
      <span className="flex flex-1 items-center gap-2 pt-0.5 text-[13px] leading-relaxed">
        {children}
        <Icon className="size-4 shrink-0 text-signal" strokeWidth={1.75} />
      </span>
    </li>
  )
}

/**
 * Offers to put Ditho on the home screen, where it opens without browser chrome.
 *
 * Two different things behind one banner, because the platforms genuinely
 * differ. Android fires `beforeinstallprompt`, which can be kept and replayed
 * from a button, so there it is one tap. Safari implements no such event, and
 * `navigator.share()` opens the sheet for *sending* a link — "Add to Home
 * Screen" lives in Safari's own toolbar, which a page cannot open. So on iOS the
 * honest thing is to show where that button is rather than pretend to press it.
 */
export function InstallPrompt() {
  const current = useSyncExternalStore(subscribe, () => mode, () => "none" as Mode)
  const [showSteps, setShowSteps] = useState(false)

  if (current === "none") return null

  const close = () => {
    setShowSteps(false)
    dismiss()
  }

  return (
    <>
      <div className="floating mb-6 flex items-center gap-3 rounded-2xl py-3 pl-4 pr-2 xl:hidden">
        <Download className="size-4 shrink-0 text-signal" strokeWidth={1.75} />

        <p className="flex-1 text-[12px] leading-snug">
          <span className="font-medium">Add Ditho to your home screen.</span>{" "}
          <span className="text-muted-foreground">
            It opens straight into the app, with no browser around it.
          </span>
        </p>

        <Button
          type="button"
          variant="outline"
          onClick={() => (current === "ios" ? setShowSteps(true) : install())}
          className="h-8 shrink-0 rounded-lg px-3 text-xs"
        >
          {current === "ios" ? "How" : "Install"}
        </Button>

        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <X className="size-3.5" strokeWidth={1.75} />
        </button>
      </div>

      {showSteps && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Add to Home Screen"
          onClick={() => setShowSteps(false)}
          className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 p-4 backdrop-blur-sm"
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="floating w-full max-w-sm rounded-2xl p-5"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold">Add to Home Screen</h2>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  Safari gives a page no way to do this itself, so it takes three taps.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSteps(false)}
                aria-label="Close"
                className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <X className="size-3.5" strokeWidth={1.75} />
              </button>
            </div>

            <ol className="flex flex-col gap-3">
              <Step n={1} icon={Share}>
                Tap Share in the Safari toolbar
              </Step>
              <Step n={2} icon={Plus}>
                Scroll down, tap Add to Home Screen
              </Step>
              <Step n={3} icon={Download}>
                Tap Add, top right
              </Step>
            </ol>

            <Button type="button" onClick={close} className="mt-5 h-9 w-full rounded-lg text-xs">
              Done
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
