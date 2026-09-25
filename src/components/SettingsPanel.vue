<script setup lang="ts">
import ModeTile from './ModeTile.vue'
import { MODES } from '@/lib/modes'
import type { DimTier } from '@/lib/params'
import { useStore } from '@/lib/store'

const store = useStore()
const { prefs, mode } = store

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
  | 'fullscreenOnStart'
  | 'media'

const TOGGLES: ReadonlyArray<{ key: BoolKey; title: string; blurb: string }> = [
  { key: 'rotate', title: 'Rotate the modes', blurb: 'A different screen every ten minutes.' },
  { key: 'pixelShift', title: 'Shift the pixels', blurb: 'Nudges the screen a few pixels every two minutes.' },
  { key: 'seconds', title: 'Show seconds', blurb: 'Update the clock every second.' },
  { key: 'hour24', title: '24-hour clock', blurb: '21:04 instead of 9:04 PM.' },
  { key: 'warm', title: 'Warm palette', blurb: 'Amber instead of ivory.' },
  { key: 'fullscreenOnStart', title: 'Fullscreen on start', blurb: 'Take the screen when the watch starts.' },
  { key: 'media', title: 'Media hold', blurb: 'The quiet stream that keeps a background tab awake.' },
]

function setBool(key: BoolKey, event: Event): void {
  prefs[key] = (event.target as HTMLInputElement).checked
}

function stepAgents(delta: number): void {
  store.setAgents(prefs.agents + delta)
}

const bool = (key: BoolKey): boolean => prefs[key]
</script>

<template>
  <section class="card rise p-5 sm:p-6">
    <h2 class="text-xl text-ink">Screensaver</h2>
    <p class="mt-1 max-w-[58ch] text-base leading-snug text-mute">
      True black, so an OLED panel leaves those pixels off.
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
          <span class="ui text-sm font-medium">{{ tier.label }}</span>
          <span class="ui ml-1.5 text-xs text-soft">{{ tier.blurb }}</span>
        </button>
      </div>
    </div>

    <div class="mt-5 border-t border-hair pt-4">
      <div class="field-row">
        <span>
          <span class="ui text-base font-medium text-ink">Agents on the stage</span>
          <span class="mt-0.5 block max-w-[54ch] text-sm leading-snug text-soft">
            How many jobs the tally counts.
          </span>
        </span>
        <span class="flex items-center gap-2">
          <button type="button" class="btn btn-quiet px-2.5 py-1.5" aria-label="One fewer agent" @click="stepAgents(-1)">−</button>
          <span class="num w-6 text-center text-base text-ink">{{ prefs.agents }}</span>
          <button type="button" class="btn btn-quiet px-2.5 py-1.5" aria-label="One more agent" @click="stepAgents(1)">+</button>
        </span>
      </div>

      <label v-for="toggle in TOGGLES" :key="toggle.key" class="field-row">
        <span>
          <span class="ui text-base font-medium text-ink">{{ toggle.title }}</span>
          <span class="mt-0.5 block max-w-[54ch] text-sm leading-snug text-soft">
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
    </div>
  </section>
</template>
