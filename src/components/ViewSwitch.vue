<script setup lang="ts">
import { computed } from 'vue'
import type { WhileRunning } from '@/lib/prefs'
import { useStore } from '@/lib/store'

const props = defineProps<{ tone: 'paper' | 'stage' }>()

const store = useStore()
const { prefs, miniSupported } = store

const MODES: ReadonlyArray<{ id: WhileRunning; label: string; blurb: string; unsupported?: string }> =
  [
    { id: 'screensaver', label: 'Screensaver', blurb: 'The black stage here, fullscreen if you ask.' },
    { id: 'panel', label: 'Panel', blurb: 'The regular screen, with the watch running behind it.' },
    {
      id: 'mini',
      label: 'Mini window',
      blurb: 'A small window on top, so you can work in another one.',
      unsupported: 'Chrome and Edge only',
    },
  ]

const blurb = computed(
  () => MODES.find((entry) => entry.id === prefs.whileRunning)?.blurb ?? '',
)
const usable = (id: WhileRunning): boolean => !(id === 'mini' && !miniSupported)

function choose(id: WhileRunning): void {
  if (!usable(id)) return
  store.setView(id)
}
</script>

<template>
  <div class="view-modes" :data-tone="tone">
    <div class="view-switch" role="group" aria-label="What to show while it runs">
      <button
        v-for="mode in MODES"
        :key="mode.id"
        type="button"
        :aria-pressed="prefs.whileRunning === mode.id"
        :disabled="!usable(mode.id)"
        :title="usable(mode.id) ? mode.blurb : mode.unsupported"
        @click="choose(mode.id)"
      >
        {{ mode.label }}
      </button>
    </div>

    <!-- Fullscreen belongs to the screensaver, so it sits in the same control
         rather than in the settings, and it is out of reach otherwise. -->
    <div v-if="props.tone === 'paper'" class="view-switch">
      <button
        type="button"
        :aria-pressed="prefs.fullscreenOnStart"
        :disabled="prefs.whileRunning !== 'screensaver'"
        title="Take the whole screen for the screensaver"
        @click="store.setFullscreen(!prefs.fullscreenOnStart)"
      >
        Fullscreen
      </button>
    </div>

    <p v-if="props.tone === 'paper'" class="view-blurb">{{ blurb }}</p>
  </div>
</template>
