"use client"

import { Crop, ImagePlus, RotateCcw, type LucideIcon } from "lucide-react"

import { CellSection } from "@/components/controls/cell-section"
import { ColorSection } from "@/components/controls/color-section"
import { MethodSection } from "@/components/controls/method-section"
import { SECTIONS, TAB_ORDER, type EditorTab } from "@/components/controls/sections"
import { ToneSection } from "@/components/controls/tone-section"
import type { DitherSettings } from "@/lib/dither/pipeline"

const PANEL_ID = "editor-tab-panel"

const ITEM =
  "flex h-14 min-w-16 shrink-0 flex-col items-center justify-center gap-1 rounded-lg border px-2 text-[10px] leading-none whitespace-nowrap transition-colors [@media(max-height:500px)]:h-11"
const IDLE =
  "border-transparent text-muted-foreground hover:border-input hover:text-foreground"
const ACTIVE = "border-signal text-signal"

function StripButton({
  label,
  icon: Icon,
  onClick,
  active,
  expanded,
}: {
  label: string
  icon: LucideIcon
  onClick: () => void
  active?: boolean
  expanded?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={expanded}
      aria-controls={expanded === undefined ? undefined : PANEL_ID}
      className={`${ITEM} ${active ? ACTIVE : IDLE}`}
    >
      <Icon className="size-5" strokeWidth={1.75} />
      {label}
    </button>
  )
}

export interface EditorTabsProps {
  settings: DitherSettings
  onChange: (next: DitherSettings) => void
  onStyleChange: (next: DitherSettings) => void
  resolution: { width: number; height: number } | null
  forVideo: boolean
  active: EditorTab | null
  onActivate: (tab: EditorTab | null) => void
  onReframe: () => void
  onReset: () => void
  onNewProject: () => void
}

export function EditorTabs({
  settings,
  onChange,
  onStyleChange,
  resolution,
  forVideo,
  active,
  onActivate,
  onReframe,
  onReset,
  onNewProject,
}: EditorTabsProps) {
  return (
    <div
      onKeyDown={(event) => {
        if (event.key === "Escape") onActivate(null)
      }}
      className="instrument relative flex shrink-0 flex-col-reverse border-t border-border bg-card xl:hidden"
    >
      <div className="dock-safe flex items-center gap-1 overflow-x-auto px-2 pt-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TAB_ORDER.map((id) => (
          <StripButton
            key={id}
            label={SECTIONS[id].label}
            icon={SECTIONS[id].icon}
            active={active === id}
            expanded={active === id}
            onClick={() => onActivate(active === id ? null : id)}
          />
        ))}

        <span className="mx-1 w-px shrink-0 self-stretch bg-border" />

        <StripButton label="Reframe" icon={Crop} onClick={onReframe} />
        <StripButton label="Reset" icon={RotateCcw} onClick={onReset} />
        <StripButton label="New project" icon={ImagePlus} onClick={onNewProject} />
      </div>

      {active !== null && (
        <div
          key={active}
          id={PANEL_ID}
          role="group"
          aria-label={SECTIONS[active].label}
          className="dock-panel"
        >
          {active === "method" && (
            <MethodSection settings={settings} onChange={onChange} forVideo={forVideo} />
          )}
          {active === "cell" && (
            <CellSection settings={settings} onChange={onChange} resolution={resolution} />
          )}
          {active === "tone" && (
            <ToneSection settings={settings} onChange={onStyleChange} />
          )}
          {active === "color" && (
            <ColorSection settings={settings} onChange={onStyleChange} />
          )}
        </div>
      )}
    </div>
  )
}
