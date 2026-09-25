<script setup lang="ts">
const ITEMS: ReadonlyArray<{ q: string; a: string }> = [
  {
    q: 'What is being held?',
    a: 'A screen wake lock while this tab is on screen, and an inaudible media stream that keeps a background tab awake. The panel says which one is working.',
  },
  {
    q: 'Why does the lock go when I switch tabs?',
    a: 'Browsers only grant it to a page that is on screen. The media stream carries the watch until you come back, and the mini window holds a lock of its own.',
  },
  {
    q: 'It still sleeps.',
    a: 'A page cannot change a power plan. On Windows, powercfg /change monitor-timeout-ac 0 and standby-timeout-ac 0 turn the timers off; on macOS, caffeinate -dims does the same while it runs.',
  },
  {
    q: 'Does it cost much?',
    a: 'The display costs, hearth does not. Black pixels are off, and there is no animation loop anywhere.',
  },
  {
    q: 'Will it burn my panel?',
    a: 'Pixel shift and the dim steps are on by default, and rotation moves the mode on every ten minutes.',
  },
  {
    q: 'Does anything leave the page?',
    a: 'No. No analytics, no account, and no request after the files load.',
  },
  {
    q: 'Why is the mini window Chrome and Edge only?',
    a: 'It uses document picture-in-picture. Elsewhere the media stream does the background work.',
  },
]
</script>

<template>
  <section class="card rise p-5 sm:p-6">
    <h2 class="text-xl text-ink">Straight answers</h2>
    <details v-for="(item, index) in ITEMS" :key="item.q" class="faq" :open="index === 0">
      <summary>
        <span class="ui text-base text-ink">{{ item.q }}</span>
        <span class="faq-mark" aria-hidden="true">+</span>
      </summary>
      <p class="faq-body text-base leading-7 text-mute">{{ item.a }}</p>
    </details>
  </section>
</template>

<style scoped>
.faq {
  border-top: 1px solid var(--color-hair);
}

.faq:first-of-type {
  border-top: 0;
  margin-top: 0.5rem;
}

summary {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.85rem 0;
  cursor: pointer;
  list-style: none;
}

summary::-webkit-details-marker {
  display: none;
}

.faq-mark {
  flex: none;
  color: var(--color-faint);
  font-family: var(--font-mono);
  font-size: 1rem;
  line-height: 1;
  transition: transform var(--dur-fast) var(--ease);
}

.faq[open] .faq-mark {
  transform: rotate(45deg);
}

.faq-body {
  max-width: 68ch;
  padding: 0 0 1rem;
}
</style>
