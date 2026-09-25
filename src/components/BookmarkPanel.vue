<script setup lang="ts">
import { onMounted, ref } from 'vue'

interface InstallPrompt extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const wakeUrl = `${location.origin}${location.pathname}?start=1`
const bookmarklet = `javascript:(()=>{window.open('${wakeUrl}','hearth')})()`

const install = ref<InstallPrompt | null>(null)
const installed = ref(false)
const copied = ref<'link' | 'bookmarklet' | null>(null)

const SHORTCUTS: ReadonlyArray<{ keys: string; what: string }> = [
  { keys: 'Space', what: 'Start or stop the watch' },
  { keys: 'M', what: 'Next screensaver' },
  { keys: 'D', what: 'Next dim step' },
  { keys: 'F', what: 'Fullscreen' },
  { keys: 'N', what: 'Mini window' },
  { keys: 'Esc', what: 'Leave fullscreen, or the preview' },
]

onMounted(() => {
  installed.value = window.matchMedia('(display-mode: standalone)').matches
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    install.value = event as InstallPrompt
  })
  window.addEventListener('appinstalled', () => {
    install.value = null
    installed.value = true
  })
})

async function copy(kind: 'link' | 'bookmarklet', text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
    copied.value = kind
    window.setTimeout(() => {
      if (copied.value === kind) copied.value = null
    }, 2000)
  } catch {
    copied.value = null
  }
}

async function installApp(): Promise<void> {
  const prompt = install.value
  if (!prompt) return
  await prompt.prompt()
  install.value = null
}
</script>

<template>
  <section class="card rise p-5 sm:p-6">
    <h2 class="text-xl text-ink">Put it one click away</h2>
    <p class="mt-1 max-w-[58ch] text-base leading-snug text-mute">
      The link carries <span class="num">?start=1</span>, which puts hearth on watch as it opens.
      Opening it again continues the same watch instead of restarting the clock, so the bookmark is
      safe to press twice.
    </p>

    <div class="mt-4 grid gap-3 sm:grid-cols-3">
      <div class="rounded-card border border-line bg-wash p-4">
        <p class="label text-soft">Bookmark</p>
        <p class="mt-1.5 text-sm leading-snug text-mute">
          Drag this to the bookmarks bar. One click opens hearth and starts the watch.
        </p>
        <a
          class="btn mt-3 w-full cursor-grab"
          :href="bookmarklet"
          draggable="true"
          @click.prevent="copy('bookmarklet', bookmarklet)"
        >
          {{ copied === 'bookmarklet' ? 'Copied' : 'Wake the hearth' }}
        </a>
      </div>

      <div class="rounded-card border border-line bg-wash p-4">
        <p class="label text-soft">Copy the link</p>
        <p class="mt-1.5 text-sm leading-snug text-mute">
          Keep it in a note, a launcher or a shortcut of your own.
        </p>
        <button class="btn mt-3 w-full" type="button" @click="copy('link', wakeUrl)">
          {{ copied === 'link' ? 'Copied' : 'Copy the wake link' }}
        </button>
      </div>

      <div class="rounded-card border border-line bg-wash p-4">
        <p class="label text-soft">Install</p>
        <p class="mt-1.5 text-sm leading-snug text-mute">
          {{
            installed
              ? 'Installed. It opens in its own window, with no browser chrome to light up the panel.'
              : 'As an app it gets its own window and works offline.'
          }}
        </p>
        <button
          v-if="install && !installed"
          class="btn mt-3 w-full"
          type="button"
          @click="installApp"
        >
          Install hearth
        </button>
        <p v-else class="mt-3 text-sm leading-snug text-soft">
          {{
            installed
              ? 'Already installed.'
              : 'Use your browser menu and choose Install, or Add to home screen.'
          }}
        </p>
      </div>
    </div>

    <div class="mt-5 border-t border-hair pt-4">
      <p class="label text-soft">Keyboard</p>
      <dl class="mt-2 grid gap-x-8 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-3">
        <div v-for="shortcut in SHORTCUTS" :key="shortcut.keys" class="flex items-baseline gap-3">
          <dt class="num min-w-[3.5rem] text-sm text-ink">{{ shortcut.keys }}</dt>
          <dd class="ui text-sm text-mute">{{ shortcut.what }}</dd>
        </div>
      </dl>
    </div>
  </section>
</template>
