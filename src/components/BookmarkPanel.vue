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
  { keys: 'Space', what: 'Start or stop' },
  { keys: 'V', what: 'Screensaver or panel' },
  { keys: 'M', what: 'Next screensaver' },
  { keys: 'D', what: 'Next dim step' },
  { keys: 'F', what: 'Fullscreen' },
  { keys: 'N', what: 'Mini window' },
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
      The link carries <span class="num">?start=1</span>: one click and the watch is on.
    </p>

    <div class="mt-4 grid gap-3 sm:grid-cols-3">
      <div class="rounded-card border border-line bg-wash p-4">
        <p class="label text-soft">Bookmark</p>
        <a
          class="btn mt-2 w-full cursor-grab"
          :href="bookmarklet"
          draggable="true"
          @click.prevent="copy('bookmarklet', bookmarklet)"
        >
          {{ copied === 'bookmarklet' ? 'Copied' : 'Wake the hearth' }}
        </a>
        <p class="mt-2 text-sm leading-snug text-soft">Drag it to the bookmarks bar.</p>
      </div>

      <div class="rounded-card border border-line bg-wash p-4">
        <p class="label text-soft">Copy the link</p>
        <button class="btn mt-2 w-full" type="button" @click="copy('link', wakeUrl)">
          {{ copied === 'link' ? 'Copied' : 'Copy the wake link' }}
        </button>
        <p class="mt-2 text-sm leading-snug text-soft">Keep it in a note or a launcher.</p>
      </div>

      <div class="rounded-card border border-line bg-wash p-4">
        <p class="label text-soft">Install</p>
        <button
          v-if="install && !installed"
          class="btn mt-2 w-full"
          type="button"
          @click="installApp"
        >
          Install hearth
        </button>
        <p v-else class="btn mt-2 w-full cursor-default justify-center" aria-hidden="true">
          {{ installed ? 'Installed' : 'Install' }}
        </p>
        <p class="mt-2 text-sm leading-snug text-soft">
          {{ installed ? 'Its own window, offline.' : 'Use the browser menu, then Install.' }}
        </p>
      </div>
    </div>

    <dl class="mt-5 flex flex-wrap gap-x-6 gap-y-1.5 border-t border-hair pt-4">
      <div v-for="shortcut in SHORTCUTS" :key="shortcut.keys" class="flex items-baseline gap-2">
        <dt class="num text-sm text-ink">{{ shortcut.keys }}</dt>
        <dd class="ui text-sm text-mute">{{ shortcut.what }}</dd>
      </div>
    </dl>
  </section>
</template>
