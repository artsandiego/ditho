"use client"

import { Download, Plus, Share, X } from "lucide-react"
import { useState, useSyncExternalStore, type ReactNode } from "react"

import { Button } from "@/components/ui/button"

const DISMISSED = "ditho:install-dismissed"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

type Mode = "none" | "ios" | "prompt"

function isInstalled(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

function isIOS(): boolean {
  const ua = window.navigator.userAgent
  return (
    /iphone|ipod|ipad/i.test(ua) ||
    (/macintosh/i.test(ua) && window.navigator.maxTouchPoints > 1)
  )
}

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
  } catch {}

  if (isIOS()) setMode("ios")

  window.addEventListener("beforeinstallprompt", (event) => {
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
  } catch {}
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
