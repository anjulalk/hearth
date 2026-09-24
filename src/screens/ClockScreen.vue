<script setup lang="ts">
import { computed } from 'vue'
import { clockParts, dateLine, elapsedShort } from '@/lib/format'
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
const date = computed(() => dateLine(new Date(props.now)))
const watch = computed(() => elapsedShort(props.elapsedMs))
const agentLine = computed(() =>
  props.agents > 0 ? `${props.agents} ${props.agents === 1 ? 'agent' : 'agents'}` : '',
)
</script>

<template>
  <div class="ss-scene">
    <p class="ss-label">{{ date }}</p>
    <p class="ss-time">
      <span>{{ clock.hour }}</span>
      <span class="ss-colon">:</span>
      <span>{{ clock.minute }}</span>
      <span v-if="seconds" class="ss-seconds">{{ clock.seconds }}</span>
      <span v-if="clock.meridiem" class="ss-seconds">{{ clock.meridiem }}</span>
    </p>
    <p class="ss-meta">
      on watch {{ watch }}<template v-if="agentLine"> · {{ agentLine }}</template
      ><template v-if="note"> · {{ note }}</template>
    </p>
  </div>
</template>
