"use client"

import type { ReactNode } from "react"

import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-b border-border">
      <h2 className="label-key border-b border-border/60 px-5 py-2.5">{title}</h2>
      {children}
    </section>
  )
}

export function Row({
  label,
  readout,
  children,
}: {
  label: string
  readout?: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-2.5 px-5 py-3.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="label-key">{label}</span>
        {readout && <span className="value-readout">{readout}</span>}
      </div>
      {children}
    </div>
  )
}

export function Dial({
  label,
  readout,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string
  readout: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
}) {
  return (
    <Row label={label} readout={readout}>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([next]) => onChange(next)}
        aria-label={label}
      />
    </Row>
  )
}

export function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3.5">
      <div className="flex flex-col gap-1">
        <span className="label-key">{label}</span>
        <span className="text-[10px] leading-snug text-muted-foreground/70">{hint}</span>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  )
}

export interface ChoiceOption<T extends string> {
  value: T
  label: string
  title?: string
}

export function Choice<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: ChoiceOption<T>[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <Row label={label}>
      <div className="flex items-center gap-1.5">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            title={option.title ?? option.label}
            aria-pressed={option.value === value}
            onClick={() => onChange(option.value)}
            className={`flex h-8 flex-1 items-center justify-center border text-[11px] transition-colors ${
              option.value === value
                ? "border-signal text-signal"
                : "border-border text-muted-foreground hover:border-input hover:text-foreground"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </Row>
  )
}

/** A bare colour chip that opens the native picker. */
export function ColorChip({
  value,
  label,
  onChange,
  className,
}: {
  value: string
  label: string
  onChange: (value: string) => void
  className?: string
}) {
  return (
    <label
      title={value.toUpperCase()}
      className={`block cursor-pointer border border-white/15 transition-colors hover:border-white/40 ${className ?? ""}`}
      style={{ background: value }}
    >
      <input
        type="color"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="sr-only"
        aria-label={label}
      />
    </label>
  )
}

export function Swatch({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="flex flex-1 cursor-pointer items-center gap-2.5 border border-border px-2.5 py-2 transition-colors hover:border-input">
      <span
        className="size-5 shrink-0 border border-white/15"
        style={{ background: value }}
      />
      <span className="flex min-w-0 flex-col">
        <span className="label-key">{label}</span>
        <span className="text-[10px] uppercase tabular-nums text-muted-foreground/70">
          {value}
        </span>
      </span>
      <input
        type="color"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="sr-only"
        aria-label={label}
      />
    </label>
  )
}
