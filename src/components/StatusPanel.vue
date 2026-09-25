<script setup lang="ts">
import { computed } from 'vue'
import type { MediaState, WakeLockState } from '@/lib/awake'
import { elapsed, elapsedShort, percent } from '@/lib/format'
import { useStore } from '@/lib/store'

const store = useStore()
const {
  prefs,
  awakeState,
  battery,
  backgroundMs,
  dayMs,
  elapsedMs,
  hold,
  lockedMs,
  miniReport,
  miniSupported,
  running,
} = store

const LOCK_LABEL: Record<WakeLockState, string> = {
  idle: 'idle',
  held: 'held',
  released: 'released',
  denied: 'refused',
  unsupported: 'not supported',
}

const MEDIA_LABEL: Record<MediaState, string> = {
  off: 'off',
  silent: 'silent',
  strong: 'strong',
  blocked: 'blocked',
}

const lockLabel = computed(() => LOCK_LABEL[awakeState.wakeLock])
const mediaLabel = computed(() => MEDIA_LABEL[awakeState.media])
const lockState = computed(() => {
  if (awakeState.wakeLock === 'held' || miniReport.lockHeld) return 'on'
  return awakeState.wakeLock === 'denied' ? 'warn' : undefined
})
const mediaState = computed(() => {
  if (awakeState.media === 'strong') return 'on'
  return awakeState.media === 'blocked' ? 'warn' : undefined
})
const batteryLabel = computed(
  () => `${percent(battery.value.level)} · ${battery.value.charging ? 'charging' : 'on battery'}`,
)
const batteryState = computed(() =>
  !battery.value.charging && battery.value.level < 0.25 ? 'warn' : undefined,
)
const problems = computed(() =>
  [
    awakeState.wakeLockError ? `The screen lock was refused: ${awakeState.wakeLockError}` : '',
    awakeState.mediaError ? `The media stream was blocked: ${awakeState.mediaError}` : '',
    miniReport.message ?? '',
  ].filter(Boolean),
)

function setMiniWindow(event: Event): void {
  const value = (event.target as HTMLInputElement).checked
  prefs.miniWindow = value
  if (!running.value) return
  if (value) void store.openMini()
  else if (miniReport.state === 'open') store.toggleMini()
}
</script>

<template>
  <section class="card rise p-5 sm:p-6">
    <div class="flex flex-wrap items-start gap-4">
      <span class="status-dot" :data-tone="hold.tone" :class="{ 'is-live': running }" />
      <div class="min-w-[15rem] flex-1">
        <p class="label text-soft">{{ running ? 'On watch' : 'Idle' }}</p>
        <h2 class="mt-1 text-xl text-ink">{{ hold.title }}</h2>
        <p class="mt-1.5 max-w-[46ch] text-base leading-snug text-mute">{{ hold.detail }}</p>
      </div>
      <div class="flex items-center gap-2">
        <button v-if="!running" type="button" class="btn btn-primary" @click="store.start()">
          Start keeping the screen on
        </button>
        <button v-else type="button" class="btn" @click="store.stop()">Stop</button>
      </div>
    </div>

    <dl
      v-if="running"
      class="mt-5 grid grid-cols-2 gap-3 border-t border-hair pt-4 sm:grid-cols-4"
    >
      <div>
        <dt class="label text-soft">On watch</dt>
        <dd class="num mt-0.5 text-lg text-ink">{{ elapsed(elapsedMs) }}</dd>
      </div>
      <div>
        <dt class="label text-soft">Screen lock</dt>
        <dd class="num mt-0.5 text-lg text-ink">{{ elapsedShort(lockedMs) }}</dd>
      </div>
      <div>
        <dt class="label text-soft">In the background</dt>
        <dd class="num mt-0.5 text-lg text-ink">{{ elapsedShort(backgroundMs) }}</dd>
      </div>
      <div>
        <dt class="label text-soft">Today</dt>
        <dd class="num mt-0.5 text-lg text-ink">{{ elapsed(dayMs) }}</dd>
      </div>
    </dl>

    <p
      v-else-if="dayMs > 0"
      class="mt-4 border-t border-hair pt-4 text-sm leading-snug text-soft"
    >
      Kept the screen on for <span class="num text-ink">{{ elapsed(dayMs) }}</span> today.
    </p>

    <div class="mt-4 flex flex-wrap items-center gap-2">
      <span class="chip" :data-state="lockState"><span class="dot" />wake lock {{ lockLabel }}</span>
      <span class="chip" :data-state="mediaState"><span class="dot" />media {{ mediaLabel }}</span>
      <span class="chip"><span class="dot" />{{ awakeState.visible ? 'tab visible' : 'tab in background' }}</span>
      <span v-if="miniReport.state === 'open'" class="chip" :data-state="miniReport.lockHeld ? 'on' : 'warn'">
        <span class="dot" />mini window {{ miniReport.lockHeld ? 'holding' : 'open' }}
      </span>
      <span v-if="battery.supported" class="chip" :data-state="batteryState">
        <span class="dot" />battery {{ batteryLabel }}
      </span>
    </div>

    <p v-for="problem in problems" :key="problem" class="mt-3 text-sm leading-snug text-soft">
      {{ problem }}
    </p>

    <label class="field-row mt-4">
      <span>
        <span class="ui text-base font-medium text-ink">Mini window</span>
        <span class="mt-0.5 block max-w-[54ch] text-sm leading-snug text-soft">
          {{
            miniSupported
              ? 'A small always-on-top window that holds its own screen lock while you work in the tab running your agents. It opens with the watch and closes with it.'
              : 'A second always-on-top window would hold the screen lock while you work elsewhere, but this browser has no document picture-in-picture, so the media hold is the fallback. Chrome and Edge have it.'
          }}
        </span>
      </span>
      <input
        class="toggle"
        type="checkbox"
        :checked="prefs.miniWindow"
        :disabled="!miniSupported"
        @change="setMiniWindow"
      />
    </label>

    <p class="mt-4 text-sm leading-snug text-soft">
      While it runs, <span class="num">M</span> changes the screensaver,
      <span class="num">D</span> cycles the dim step, <span class="num">F</span> toggles
      fullscreen, <span class="num">N</span> toggles the mini window, and
      <span class="num">Space</span> stops the watch.
    </p>
  </section>
</template>
