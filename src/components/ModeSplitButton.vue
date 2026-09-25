<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { MODES, modeDef, nextMode } from '@/lib/modes'
import type { ModeId } from '@/lib/params'
import { useStore } from '@/lib/store'

/** A split button: the name advances the screensaver, the chevron opens the list. */
const store = useStore()
const { mode } = store

const root = ref<HTMLElement | null>(null)
const open = ref(false)
const name = computed(() => modeDef(mode.value).name)
const nextName = computed(() => modeDef(nextMode(mode.value)).name)

function close(): void {
  open.value = false
  store.pinControls(false)
}

function toggle(): void {
  open.value = !open.value
  // An open menu keeps the bar on screen, however still the mouse is.
  store.pinControls(open.value)
}

function choose(id: ModeId): void {
  store.setMode(id)
  close()
}

function onOutside(event: PointerEvent): void {
  if (root.value && !root.value.contains(event.target as Node)) close()
}

function onKey(event: KeyboardEvent): void {
  if (event.key === 'Escape') close()
}

watch(open, (value) => {
  if (value) {
    document.addEventListener('pointerdown', onOutside, true)
    document.addEventListener('keydown', onKey)
  } else {
    document.removeEventListener('pointerdown', onOutside, true)
    document.removeEventListener('keydown', onKey)
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onOutside, true)
  document.removeEventListener('keydown', onKey)
})
</script>

<template>
  <div ref="root" class="split" :data-open="open">
    <button
      type="button"
      class="split-main"
      :title="`Next screensaver: ${nextName}`"
      @click="store.cycleMode()"
    >
      {{ name }}
    </button>
    <button
      type="button"
      class="split-more"
      :aria-expanded="open"
      aria-haspopup="listbox"
      aria-label="Choose a screensaver"
      @click="toggle"
    >
      <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
        <path
          d="M2 3.5 L5 6.5 L8 3.5"
          fill="none"
          stroke="currentColor"
          stroke-width="1.4"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>
    <ul v-if="open" class="split-menu" role="listbox" aria-label="Screensavers">
      <li v-for="def in MODES" :key="def.id">
        <button
          type="button"
          role="option"
          :aria-selected="def.id === mode"
          @click="choose(def.id)"
        >
          {{ def.name }}
        </button>
      </li>
    </ul>
  </div>
</template>
