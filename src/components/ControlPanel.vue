<script setup lang="ts">
import AppearanceToggle from './AppearanceToggle.vue'
import BookmarkPanel from './BookmarkPanel.vue'
import EmberMark from './EmberMark.vue'
import FaqPanel from './FaqPanel.vue'
import SettingsPanel from './SettingsPanel.vue'
import StatusPanel from './StatusPanel.vue'

const MENU: ReadonlyArray<{ label: string; href: string }> = [
  { label: 'Source', href: 'https://github.com/anjulalk/hearth' },
  { label: 'Design system', href: 'https://anjula.dev/design/tokens.css' },
  { label: 'anjula.dev', href: 'https://anjula.dev' },
]
</script>

<template>
  <!-- The shared page shell (DESIGN.md, Page shell): one 80rem column with the
       wide gutters, a header, an intro of a lede and a supporting line, the
       content, then a footer with no rule above it. -->
  <div class="shell pt-6 sm:pt-10">
    <header class="pb-6 sm:pb-10">
      <div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <h1 class="ui flex items-center gap-2.5 text-xl font-semibold text-ink">
          <EmberMark :size="26" />
          hearth
        </h1>
        <nav class="flex flex-wrap items-center gap-x-5 gap-y-1 sm:gap-x-7">
          <a
            v-for="item in MENU"
            :key="item.href"
            class="ui text-sm font-medium text-ink transition-colors hover:text-clay"
            :href="item.href"
            >{{ item.label }}</a
          >
        </nav>
      </div>
    </header>

    <p class="intro-lede text-lg text-ink">
      hearth keeps a screen on while a long job runs, so a display that went idle never costs you
      the last five minutes of work.
    </p>
    <p class="intro-support mt-5 max-w-2xl text-mute">
      It holds the browser's screen wake lock and keeps a quiet media stream alive, so a tab in the
      background is not frozen while the agents work, and it puts a true black screensaver on the
      display in between. A page cannot change a power plan, so the panel says which hold is doing
      the work rather than claiming the screen cannot sleep.
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
            © 2026
            <a
              class="underline-offset-2 transition-colors hover:text-ink hover:underline"
              href="https://anjula.dev"
              >Anjula Karunarathne</a
            >. The source is on
            <a
              class="underline-offset-2 transition-colors hover:text-ink hover:underline"
              href="https://github.com/anjulalk/hearth"
              >GitHub</a
            >, under the MIT licence.
          </p>
          <p class="text-xs">
            hearth holds what a page can hold. Your operating system's power settings are yours, and
            nothing here changes them.
          </p>
        </div>
        <AppearanceToggle />
      </div>
    </footer>
  </div>
</template>
