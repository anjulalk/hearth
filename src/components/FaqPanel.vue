<script setup lang="ts">
const ITEMS: ReadonlyArray<{ q: string; a: string[] }> = [
  {
    q: 'What is actually being held?',
    a: [
      'Two things, and the panel says which one is doing the work. The first is the browser\'s own screen wake lock: while this tab is on screen, the browser stops the display dimming, locking and turning off. The second is a media hold: a two pixel video and a 40 Hz tone at about -80 dB, inaudible, which the browser treats as playback. A tab that is playing media is exempt from the background freezer, and the operating system is asked not to suspend while it plays.',
      'Neither one can change a power plan. What a page can do is hold both levers and tell you the truth about which one is holding.',
    ],
  },
  {
    q: 'Why does the wake lock go away when I switch tabs?',
    a: [
      'That is the browser protecting you: a screen wake lock is only granted to a document that is on screen, and it is released the moment the tab goes to the background. It comes back the moment you return. The media hold is what carries the watch in between, which is why the panel shows the background time separately.',
      'If you want the strong hold while you work in another window, open the mini window. It is a second visible document with its own lock, so the screen lock stays held.',
    ],
  },
  {
    q: 'It still sleeps. What do I change?',
    a: [
      'Check the operating system first, because that is where sleep is decided. On Windows, powercfg /requests prints what is currently holding sleep and the display, and powercfg /change monitor-timeout-ac 0 with standby-timeout-ac 0 turns the timers off on mains power. Use the -dc variants for battery. On macOS, caffeinate -dims holds the display and the system for as long as it runs. On Linux, systemd-inhibit --what=idle:sleep --why="agents running" sleep infinity does the same.',
      'Then check the panel. If the wake lock is refused, the browser had a reason, and a low battery is the common one. If the media hold is blocked, the browser would not play the stream. If both are held and the machine still sleeps, the operating system is deciding, and no page can overrule it.',
    ],
  },
  {
    q: 'Does keeping the screen on cost much?',
    a: [
      'The display is the cost, not this page. A true black OLED pixel is off, so a mostly black stage with a handful of lit pixels draws a fraction of what a normal web page does. The processor side is small by design: one timer a second, no animation frame loop, and animations that only move or fade so the compositor can do them without repainting.',
      'On a laptop, watch the battery chip. hearth warns when it is below a quarter and unplugged, and it will not argue with you about stopping.',
    ],
  },
  {
    q: 'Will a static screen damage my panel?',
    a: [
      'Probably not, and hearth stacks the odds anyway: the whole stage shifts a few pixels every two minutes, the dim steps fall away while nobody is there, and rotation walks through the modes every ten minutes so no single pattern owns the same pixels all night. Warm palette is the default for the same reason.',
    ],
  },
  {
    q: 'Does anything leave the page?',
    a: [
      'No. There is no analytics, no account and no request after the files load. The only outside request is the web font, and the service worker caches the shell so it opens offline. Everything else lives in this tab and in your own local storage: the mode, the settings and the day\'s total.',
    ],
  },
  {
    q: 'Why is the mini window Chrome and Edge only?',
    a: [
      'It uses document picture-in-picture, which those browsers have and Safari and Firefox do not. Everywhere else the media hold does the work in the background, and the wake lock does it while the tab is visible. The button hides itself when the browser cannot do it.',
    ],
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
      <div class="faq-body">
        <p v-for="paragraph in item.a" :key="paragraph" class="text-base leading-7 text-mute">
          {{ paragraph }}
        </p>
      </div>
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
  display: grid;
  gap: 0.6rem;
  max-width: 68ch;
  padding: 0 0 1rem;
}
</style>
