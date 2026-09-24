<script setup lang="ts">
import BookmarkPanel from './BookmarkPanel.vue'
import EmberMark from './EmberMark.vue'
import FaqPanel from './FaqPanel.vue'
import SettingsPanel from './SettingsPanel.vue'
import StatusPanel from './StatusPanel.vue'
</script>

<template>
  <div class="min-h-dvh">
    <header class="shell flex items-center justify-between py-6">
      <div class="flex items-center gap-2.5">
        <EmberMark :size="30" />
        <span class="text-[1.375rem] tracking-[-0.015em] text-ink">hearth</span>
      </div>
      <a class="ui text-[0.8125rem] text-soft transition-colors hover:text-ink" href="https://anjula.dev">
        anjula.dev
      </a>
    </header>

    <main class="shell pb-20">
      <section class="rise max-w-[46rem]">
        <p class="label text-clay">Keep awake for long jobs</p>
        <h1 class="mt-2 text-[clamp(2rem,5vw,3rem)] leading-[1.08] text-ink">
          Keep the screen on while the agents work.
        </h1>
        <p class="mt-4 max-w-[62ch] text-[1.125rem] leading-[1.75rem] text-mute">
          hearth asks the browser for a screen wake lock and keeps a quiet media stream alive, so a
          display does not dim or sleep while a long job runs in another tab. Between you and the
          screen it puts a true black stage: a clock, an ember, a star field, or a tally of the
          agents at work, so an OLED panel does not have to sit on a bright page.
        </p>
      </section>

      <div class="mt-8 grid gap-4">
        <StatusPanel />
        <SettingsPanel />
        <BookmarkPanel />
        <FaqPanel />
      </div>
    </main>

    <footer class="shell border-t border-line py-8">
      <p class="ui text-[0.8125rem] text-soft">
        Built by
        <a class="text-clay transition-colors hover:text-clay-strong" href="https://anjula.dev">Anjula Karunarathne</a>.
        <a class="ml-3 text-soft transition-colors hover:text-ink" href="https://github.com/anjulalk/hearth">Source</a>
        <a class="ml-3 text-soft transition-colors hover:text-ink" href="https://anjula.dev/design/tokens.css">Design tokens</a>
        <span class="ml-3">MIT</span>
      </p>
    </footer>
  </div>
</template>
