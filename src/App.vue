<script setup lang="ts">
import { onBeforeUnmount, onMounted, provide } from 'vue'
import ControlPanel from '@/components/ControlPanel.vue'
import Screensaver from '@/screens/Screensaver.vue'
import { STORE_KEY, createStore } from '@/lib/store'

const store = createStore()
provide(STORE_KEY, store)

const { showStage } = store

function onKey(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    if (store.preview.value) store.endPreview()
    else void store.toggleFullscreen()
    return
  }

  // A control that has focus answers to the keyboard itself. Space on a focused
  // button is a click, and this handler must not make it two.
  const tag = (event.target as HTMLElement | null)?.tagName ?? ''
  if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A'].includes(tag)) return
  if (event.metaKey || event.ctrlKey || event.altKey) return

  switch (event.key) {
    case ' ':
      event.preventDefault()
      void store.toggle()
      break
    case 'v':
    case 'V':
      if (store.running.value) {
        store.setView(store.prefs.whileRunning === 'screensaver' ? 'panel' : 'screensaver')
        store.showControls()
      }
      break
    case 'f':
    case 'F':
      void store.toggleFullscreen()
      break
    case 'm':
    case 'M':
      store.cycleMode()
      store.showControls()
      break
    case 'd':
    case 'D':
      store.cycleDim()
      store.showControls()
      break
    case 'n':
    case 'N':
      if (store.running.value && store.miniSupported) store.toggleMini()
      break
    case 'c':
    case 'C':
      store.showControls()
      break
  }
}

onMounted(() => {
  store.attach()
  window.addEventListener('keydown', onKey)
  // A link that says so, a watch that was running, or nothing.
  if (store.autoStart) void store.start('auto')
  else if (store.canRestore) void store.start('restore')
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  store.dispose()
})
</script>

<template>
  <ControlPanel v-if="!showStage" />
  <Screensaver v-else />
</template>
