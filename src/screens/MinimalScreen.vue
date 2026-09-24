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
</script>

<template>
  <div class="ss-scene is-corner">
    <p class="ss-meta">
      <span class="ss-mini-dot" />{{ clock.time }} · on watch {{ watch }}
    </p>
    <p v-if="note" class="ss-meta">{{ note }}</p>
  </div>
</template>
