<script setup lang="ts">
import { computed } from 'vue'
import AppearanceToggle from './AppearanceToggle.vue'
import BookmarkPanel from './BookmarkPanel.vue'
import EmberMark from './EmberMark.vue'
import FaqPanel from './FaqPanel.vue'
import SettingsPanel from './SettingsPanel.vue'
import StatusPanel from './StatusPanel.vue'
import { elapsedShort } from '@/lib/format'
import { useStore } from '@/lib/store'

const store = useStore()
const { awakeState, dayMs, elapsedMs, hold, running } = store

/** The header's one glance: is it holding, and for how long. */
const status = computed(() => {
  if (!running.value) {
    return dayMs.value > 0 ? `idle · today ${elapsedShort(dayMs.value)}` : 'idle'
  }
  const kept = elapsedShort(elapsedMs.value)
  switch (hold.value.level) {
    case 'screen':
      return `on watch · ${kept}`
    case 'media':
      return `${awakeState.visible ? 'media hold' : 'in the background'} · ${kept}`
    default:
      return `weak hold · ${kept}`
  }
})
</script>

<template>
  <!-- The shared page shell (DESIGN.md, Page shell): one 80rem column with the
       wide gutters, a header, an intro of a lede and a supporting line, the
       content, then a footer with no rule above it. -->
  <div class="shell pt-6 sm:pt-10">
    <header class="pb-6 sm:pb-10">
      <div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <h1
          class="ui flex w-full items-center gap-2.5 text-xl leading-[1.2] font-semibold tracking-[-0.011em] text-ink sm:w-auto"
        >
          <span>hearth</span>
          <EmberMark :size="26" />
        </h1>
        <p class="header-status" :data-tone="running ? hold.tone : 'off'" :title="hold.detail">
          <span class="dot" />{{ status }}
        </p>
      </div>
    </header>

    <p class="intro-lede text-lg text-ink">
      hearth keeps a screen awake while agents work, and keeps it true black while they do.
    </p>
    <p class="intro-support mt-5 max-w-2xl text-mute">
      Every screensaver is a handful of lit pixels, so an OLED panel leaves the rest off. Two holds
      keep the display awake: the browser's screen wake lock, and a quiet media stream.
    </p>

    <main class="mt-12 grid gap-4">
      <StatusPanel />
      <SettingsPanel />
      <BookmarkPanel />
      <FaqPanel />
    </main>

    <footer class="footer ui mt-12 py-10 text-sm text-soft">
      <div class="flex items-center justify-between gap-4">
        <div>
          <p>
            Built by
            <a
              class="underline-offset-2 transition-colors hover:text-ink hover:underline"
              href="https://anjula.dev"
              >Anjula Karunarathne</a
            >.
          </p>
          <p class="mt-1 text-xs">
            <a
              class="underline-offset-2 transition-colors hover:text-ink hover:underline"
              href="https://github.com/anjulalk/hearth"
              >Source</a
            >
            <span class="mx-1.5">·</span>
            <a
              class="underline-offset-2 transition-colors hover:text-ink hover:underline"
              href="https://anjula.dev/design/tokens.css"
              >Design system</a
            >
          </p>
        </div>
        <AppearanceToggle />
      </div>
    </footer>
  </div>
</template>
