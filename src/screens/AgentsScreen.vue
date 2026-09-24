<script setup lang="ts">
import { computed } from 'vue'
import { clockParts, elapsedShort, pad } from '@/lib/format'
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

/** Every agent looks busy on its own schedule, without a timer of its own. */
const TASKS = [
  'reading',
  'thinking',
  'editing files',
  'running tests',
  'checking a diff',
  'waiting on the model',
  'writing notes',
  'searching the web',
]

const count = computed(() => Math.max(1, props.agents))
const clock = computed(() => clockParts(new Date(props.now), props.hour24))
const watch = computed(() => elapsedShort(props.elapsedMs))
const bucket = computed(() => Math.floor(props.now / 45_000))

function task(index: number): string {
  const spot = (index * 3 + bucket.value) % TASKS.length
  return TASKS[spot] ?? 'working'
}

function dotStyle(index: number): Record<string, string> {
  return { '--dur': `${5 + (index % 3) * 2}s`, '--delay': `${(index % 4) * 0.8}s` }
}
</script>

<template>
  <div class="ss-scene">
    <p class="ss-time ss-time-small">{{ count }}</p>
    <p class="ss-label">{{ count === 1 ? 'agent at work' : 'agents at work' }}</p>
    <ul class="ss-agents">
      <li v-for="index in count" :key="index" class="ss-agent">
        <span class="ss-agent-dot" :style="dotStyle(index)" />
        <span class="ss-agent-name">agent {{ pad(index) }}</span>
        <span class="ss-agent-task">{{ task(index) }}</span>
      </li>
    </ul>
    <p class="ss-meta">
      {{ clock.time }} · on watch {{ watch }}<template v-if="note"> · {{ note }}</template>
    </p>
  </div>
</template>
