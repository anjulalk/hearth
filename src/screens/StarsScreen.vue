<script setup lang="ts">
import { computed } from 'vue'
import { clockParts, elapsedShort } from '@/lib/format'
import type { HoldLevel } from '@/lib/holds'

const props = defineProps<{
  now: number
  elapsedMs: number
  hour24: boolean
  seconds: boolean
  agents: number
  holdLevel: HoldLevel
  note: string | null
}>()

interface Star {
  x: number
  y: number
  size: number
  dur: number
  delay: number
}

interface Layer {
  drift: number
  stars: Star[]
}

/** Positions are fixed by a seed, so the sky is the same every night. */
function mulberry32(seed: number): () => number {
  let state = seed
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function makeStars(random: () => number, count: number, min: number, max: number): Star[] {
  return Array.from({ length: count }, () => ({
    x: Math.round(random() * 1000) / 10,
    y: Math.round(random() * 1000) / 10,
    size: Math.round((min + random() * (max - min)) * 10) / 10,
    dur: Math.round(6000 + random() * 9000),
    delay: Math.round(random() * 8000),
  }))
}

const layers = computed<Layer[]>(() => {
  const random = mulberry32(20260925)
  return [
    { drift: 260_000, stars: makeStars(random, 18, 1, 1.6) },
    { drift: 190_000, stars: makeStars(random, 14, 1.2, 2) },
    { drift: 130_000, stars: makeStars(random, 10, 1.6, 2.6) },
  ]
})

const clock = computed(() => clockParts(new Date(props.now), props.hour24))
const watch = computed(() => elapsedShort(props.elapsedMs))

function starStyle(star: Star): Record<string, string> {
  return {
    left: `${star.x}%`,
    top: `${star.y}%`,
    '--size': `${star.size}px`,
    '--dur': `${star.dur}ms`,
    '--delay': `${star.delay}ms`,
  }
}
</script>

<template>
  <div class="ss-field">
    <div
      v-for="(layer, index) in layers"
      :key="index"
      class="ss-layer"
      :style="{ '--drift': `${layer.drift}ms` }"
    >
      <span
        v-for="(star, spot) in layer.stars"
        :key="spot"
        class="ss-star"
        :style="starStyle(star)"
      />
    </div>
  </div>
  <div class="ss-scene is-corner">
    <p class="ss-time ss-time-small">
      <span>{{ clock.hour }}</span>
      <span class="ss-colon">:</span>
      <span>{{ clock.minute }}</span>
    </p>
    <p class="ss-meta">
      on watch {{ watch }}<template v-if="note"> · {{ note }}</template>
    </p>
  </div>
</template>
