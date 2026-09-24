<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import AgentsScreen from '@/screens/AgentsScreen.vue'
import ClockScreen from '@/screens/ClockScreen.vue'
import EmberScreen from '@/screens/EmberScreen.vue'
import MinimalScreen from '@/screens/MinimalScreen.vue'
import StarsScreen from '@/screens/StarsScreen.vue'
import type { HoldLevel } from '@/lib/holds'
import type { ModeId } from '@/lib/params'

const props = defineProps<{
  mode: ModeId
  startedAt: number
  holdLevel: HoldLevel
  short: string
  running: boolean
  visible: boolean
  warm: boolean
  hour24: boolean
  seconds: boolean
  agents: number
  onCycle: () => void
}>()

const SCREENS = {
  clock: ClockScreen,
  ember: EmberScreen,
  stars: StarsScreen,
  agents: AgentsScreen,
  minimal: MinimalScreen,
} as const

const now = ref(Date.now())
let timer: number | undefined

// The mini window keeps its own timer. The app's ticker stops while the main
// tab is hidden, which is exactly when this window is the one doing the work.
onMounted(() => {
  timer = window.setInterval(() => {
    now.value = Date.now()
  }, 1000)
})

onBeforeUnmount(() => {
  if (timer !== undefined) clearInterval(timer)
})

const screen = computed(() => SCREENS[props.mode])
const elapsedMs = computed(() => Math.max(0, now.value - props.startedAt))
const label = computed(() => (props.running ? `${props.short} · mini` : 'not holding'))
const screenProps = computed(() => ({
  now: now.value,
  elapsedMs: elapsedMs.value,
  hour24: props.hour24,
  seconds: props.seconds,
  agents: props.agents,
  holdLevel: props.running ? props.holdLevel : ('off' as const),
  note: null,
}))
</script>

<template>
  <div class="mini-stage" :class="{ 'ss-warm': warm }" @click="onCycle">
    <component :is="screen" v-bind="screenProps" />
    <p class="mini-status" :data-level="running ? holdLevel : 'off'">
      <span class="dot" />{{ label }}
    </p>
  </div>
</template>
