<script setup lang="ts">
import { computed } from 'vue'
import AgentsScreen from './AgentsScreen.vue'
import ClockScreen from './ClockScreen.vue'
import EmberScreen from './EmberScreen.vue'
import MinimalScreen from './MinimalScreen.vue'
import StarsScreen from './StarsScreen.vue'
import { modeDef } from '@/lib/modes'
import { percent } from '@/lib/format'
import { useStore } from '@/lib/store'

const SCREENS = {
  clock: ClockScreen,
  ember: EmberScreen,
  stars: StarsScreen,
  agents: AgentsScreen,
  minimal: MinimalScreen,
} as const

const store = useStore()
const {
  prefs,
  mode,
  running,
  hold,
  dimTier,
  shift,
  now,
  elapsedMs,
  controlsVisible,
  fullscreen,
  battery,
} = store

/** A watch held on battery, overnight, is the case worth warning about. */
const batteryLow = computed(
  () => battery.value.supported && !battery.value.charging && battery.value.level < 0.25,
)

const screen = computed(() => SCREENS[mode.value])
const modeName = computed(() => modeDef(mode.value).name)
const shiftStyle = computed(() => ({ '--sx': `${shift.x}px`, '--sy': `${shift.y}px` }))

/** A preview is dismissed by the click that proves nobody is holding anything. */
function onPointerDown(): void {
  if (!running.value) store.endPreview()
}
const screenProps = computed(() => ({
  now: now.value,
  elapsedMs: elapsedMs.value,
  hour24: prefs.hour24,
  seconds: prefs.seconds,
  agents: prefs.agents,
  holdLevel: running.value ? hold.value.level : ('off' as const),
  note: running.value ? hold.value.note : 'preview · nothing held',
}))
</script>

<template>
  <div class="stage" :class="{ 'ss-warm': prefs.warm }" @pointerdown="onPointerDown">
    <div class="stage-shift" :style="shiftStyle">
      <div class="stage-content" :class="`dim-${dimTier}`">
        <component :is="screen" v-bind="screenProps" />
      </div>
    </div>

    <div class="stage-bar" :class="{ 'is-visible': controlsVisible }">
      <button v-if="running" type="button" class="stage-bar-strong" @click="store.stop()">
        Stop
      </button>
      <button v-else type="button" class="stage-bar-strong" @click="store.endPreview()">
        Close preview
      </button>
      <button type="button" @click="store.cycleMode()">{{ modeName }}</button>
      <button type="button" @click="store.cycleDim()">Dim {{ prefs.dim }}</button>
      <button type="button" @click="store.toggleFullscreen()">
        {{ fullscreen ? 'Windowed' : 'Fullscreen' }}
      </button>
      <button
        v-if="running && store.miniSupported"
        type="button"
        @click="store.toggleMini()"
      >
        {{ store.miniReport.state === 'open' ? 'Close mini' : 'Mini window' }}
      </button>
    </div>

    <p v-if="!running" class="stage-hint">
      Preview only, nothing is being held. Click anywhere to go back.
    </p>
    <p v-else-if="store.awakeState.needsGesture" class="stage-hint">
      Click anywhere once to let the quiet audio track start, so the hold survives the background.
    </p>

    <div v-if="running && (hold.level !== 'screen' || batteryLow)" class="stage-marks">
      <p v-if="hold.level !== 'screen'" :data-level="hold.level">
        <span class="dot" />{{ hold.short }}
      </p>
      <p v-if="batteryLow" data-level="media"><span class="dot" />battery {{ percent(battery.level) }}</p>
    </div>
  </div>
</template>
