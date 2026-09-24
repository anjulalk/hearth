<script setup lang="ts">
withDefaults(defineProps<{ size?: number; muted?: boolean }>(), { size: 28, muted: false })
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 32 32"
    fill="none"
    aria-hidden="true"
    class="ember-mark"
  >
    <defs>
      <radialGradient id="hearth-ember-glow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="var(--color-clay-soft)" stop-opacity="0.5" />
        <stop offset="60%" stop-color="var(--color-clay-soft)" stop-opacity="0.12" />
        <stop offset="100%" stop-color="var(--color-clay-soft)" stop-opacity="0" />
      </radialGradient>
    </defs>
    <circle cx="16" cy="16" r="13" fill="url(#hearth-ember-glow)" />
    <circle cx="16" cy="16" r="4.4" :fill="muted ? 'var(--color-faint)' : 'var(--color-clay)'" />
    <circle v-if="!muted" cx="14.6" cy="14.5" r="1.3" fill="var(--color-clay-soft)" />
  </svg>
</template>
