<script setup lang="ts">
import type { WhileRunning } from '@/lib/prefs'
import { useStore } from '@/lib/store'

defineProps<{ tone: 'paper' | 'stage' }>()

const store = useStore()
const { prefs } = store

const SEGMENTS: ReadonlyArray<{ id: WhileRunning; label: string }> = [
  { id: 'screensaver', label: 'Screensaver' },
  { id: 'panel', label: 'Panel' },
]
</script>

<template>
  <div class="view-switch" :data-tone="tone" role="group" aria-label="What to show while it runs">
    <button
      v-for="segment in SEGMENTS"
      :key="segment.id"
      type="button"
      :aria-pressed="prefs.whileRunning === segment.id"
      @click="store.setView(segment.id)"
    >
      {{ segment.label }}
    </button>
  </div>
</template>
