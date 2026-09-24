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

const clock = computed(() => clockParts(new Date(props.now), props.hour24))
const watch = computed(() => elapsedShort(props.elapsedMs))
/** The ember burns low while only the media stream is carrying the watch. */
const lit = computed(() => props.holdLevel === 'screen')
</script>

<template>
  <div class="ss-scene">
    <div class="ss-ember" :class="{ 'is-dim': !lit }">
      <div class="ss-ember-glow" />
      <div class="ss-ember-core" />
    </div>
    <p class="ss-time ss-time-small">
      <span>{{ clock.hour }}</span>
      <span class="ss-colon">:</span>
      <span>{{ clock.minute }}</span>
      <span v-if="clock.meridiem" class="ss-seconds">{{ clock.meridiem }}</span>
    </p>
    <p class="ss-meta">
      on watch {{ watch }}<template v-if="note"> · {{ note }}</template>
    </p>
  </div>
</template>
