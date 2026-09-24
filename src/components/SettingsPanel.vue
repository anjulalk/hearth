<script setup lang="ts">
import ModeTile from './ModeTile.vue'
import { MODES } from '@/lib/modes'
import type { DimTier } from '@/lib/params'
import { useStore } from '@/lib/store'
import type { Appearance } from '@/lib/prefs'

const store = useStore()
const { prefs, appearance, mode, running } = store

const DIMS: ReadonlyArray<{ id: DimTier; label: string; blurb: string }> = [
  { id: 'off', label: 'Off', blurb: 'stays bright' },
  { id: 'gentle', label: 'Gentle', blurb: 'dims at 3 and 15 min' },
  { id: 'deep', label: 'Deep', blurb: 'dims at 1, 5 and 20 min' },
]

type BoolKey =
  | 'rotate'
  | 'pixelShift'
  | 'seconds'
  | 'hour24'
  | 'warm'
  | 'fullscreen'
  | 'media'

const TOGGLES: ReadonlyArray<{ key: BoolKey; title: string; blurb: string }> = [
  {
    key: 'rotate',
    title: 'Rotate the modes',
    blurb: 'Walks through every screensaver every ten minutes, so one pattern never sits on the same pixels all night.',
  },
  {
    key: 'pixelShift',
    title: 'Shift the pixels',
    blurb: 'Nudges the whole screen a few pixels every two minutes. Cheap insurance for a panel that is on for hours.',
  },
  {
    key: 'seconds',
    title: 'Show seconds',
    blurb: 'One more text update every second. Off keeps the clock on the minute and the screen on fewer changes.',
  },
  {
    key: 'hour24',
    title: '24-hour clock',
    blurb: 'Use 21:04 instead of 9:04 PM.',
  },
  {
    key: 'warm',
    title: 'Warm palette',
    blurb: 'Amber instead of ivory, so the small hours are easier on the eyes and the panel.',
  },
  {
    key: 'fullscreen',
    title: 'Go fullscreen on start',
    blurb: 'Ignored while the mini window is on, because the mini window is the stronger hold.',
  },
  {
    key: 'media',
    title: 'Media hold',
    blurb: 'The inaudible stream that keeps a hidden tab out of the browser freezer. Turning it off leaves only the screen lock.',
  },
]

function setBool(key: BoolKey, event: Event): void {
  prefs[key] = (event.target as HTMLInputElement).checked
}

function setAppearance(event: Event): void {
  const value = (event.target as HTMLSelectElement).value
  appearance.value = (value === 'light' || value === 'dark' ? value : 'auto') as Appearance
}

function stepAgents(delta: number): void {
  store.setAgents(prefs.agents + delta)
}

const bool = (key: BoolKey): boolean => prefs[key]
</script>

<template>
  <section class="card rise p-5 sm:p-6">
    <h2 class="text-[1.25rem] text-ink">Screensaver</h2>
    <p class="mt-1 max-w-[58ch] text-[0.9375rem] leading-snug text-mute">
      The stage stays true black, so an OLED panel leaves those pixels off. Every mode is a handful
      of lit pixels and animations that only move or fade, which the compositor can do without the
      processor.
    </p>

    <div class="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      <ModeTile
        v-for="def in MODES"
        :key="def.id"
        :mode="def"
        :active="def.id === mode"
        @select="store.setMode(def.id)"
        @preview="store.startPreview(def.id)"
      />
    </div>

    <div class="mt-5">
      <p class="label text-soft">Dimming while nobody is here</p>
      <div class="mt-2 flex flex-wrap gap-2">
        <button
          v-for="tier in DIMS"
          :key="tier.id"
          type="button"
          class="btn btn-quiet px-3 py-2"
          :aria-pressed="prefs.dim === tier.id"
          :class="{ 'border-line bg-wash text-ink': prefs.dim === tier.id }"
          @click="prefs.dim = tier.id"
        >
          <span class="ui text-[0.875rem] font-medium">{{ tier.label }}</span>
          <span class="ui ml-1.5 text-[0.75rem] text-soft">{{ tier.blurb }}</span>
        </button>
      </div>
    </div>

    <div class="mt-5 border-t border-hair pt-4">
      <div class="field-row">
        <span>
          <span class="ui text-[0.9375rem] font-medium text-ink">Agents on the stage</span>
          <span class="mt-0.5 block max-w-[54ch] text-[0.875rem] leading-snug text-soft">
            How many jobs the Agents screensaver counts. It is a tally for the story you are telling
            yourself, not a connection to anything.
          </span>
        </span>
        <span class="flex items-center gap-2">
          <button type="button" class="btn btn-quiet px-2.5 py-1.5" aria-label="One fewer agent" @click="stepAgents(-1)">−</button>
          <span class="num w-6 text-center text-[1rem] text-ink">{{ prefs.agents }}</span>
          <button type="button" class="btn btn-quiet px-2.5 py-1.5" aria-label="One more agent" @click="stepAgents(1)">+</button>
        </span>
      </div>

      <label v-for="toggle in TOGGLES" :key="toggle.key" class="field-row">
        <span>
          <span class="ui text-[0.9375rem] font-medium text-ink">{{ toggle.title }}</span>
          <span class="mt-0.5 block max-w-[54ch] text-[0.875rem] leading-snug text-soft">
            {{ toggle.blurb }}
          </span>
        </span>
        <input
          class="toggle"
          type="checkbox"
          :checked="bool(toggle.key)"
          @change="setBool(toggle.key, $event)"
        />
      </label>

      <div class="field-row">
        <span>
          <span class="ui text-[0.9375rem] font-medium text-ink">Appearance</span>
          <span class="mt-0.5 block max-w-[54ch] text-[0.875rem] leading-snug text-soft">
            This panel follows the system by default. The stage is always black.
          </span>
        </span>
        <select class="btn py-2" :value="appearance" @change="setAppearance">
          <option value="auto">Follow the system</option>
          <option value="light">Paper</option>
          <option value="dark">Ink</option>
        </select>
      </div>
    </div>

    <p v-if="running" class="mt-4 text-[0.875rem] leading-snug text-soft">
      Changes apply to the screensaver that is already running.
    </p>
  </section>
</template>
