<script setup lang="ts">
import type { ModeDef } from '@/lib/modes'

defineProps<{ mode: ModeDef; active: boolean }>()
const emit = defineEmits<{ select: []; preview: [] }>()
</script>

<template>
  <div class="mode-tile" :data-active="active">
    <button
      type="button"
      class="mode-select"
      :aria-pressed="active"
      :aria-label="`Use the ${mode.name} screensaver`"
      @click="emit('select')"
    >
      <span class="mode-art" :data-mode="mode.id" aria-hidden="true"><i /><i /><i /><i /></span>
      <span class="mode-text">
        <span class="ui text-[0.8125rem] font-medium text-ink">{{ mode.name }}</span>
        <span class="mt-0.5 block text-[0.75rem] leading-snug text-soft">{{ mode.blurb }}</span>
      </span>
    </button>
    <button type="button" class="mode-preview label" @click.stop="emit('preview')">Preview</button>
  </div>
</template>

<style scoped>
.mode-tile {
  position: relative;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-card);
  background: var(--color-card);
  transition: border-color var(--dur-fast) var(--ease), box-shadow var(--dur-fast) var(--ease);
}

.mode-tile:hover {
  border-color: var(--color-faint);
}

.mode-tile[data-active='true'] {
  border-color: var(--color-clay);
  box-shadow: 0 0 0 1px var(--color-clay);
}

.mode-select {
  display: flex;
  width: 100%;
  align-items: flex-start;
  gap: 0.7rem;
  /* The bottom band is kept clear for the Preview button, so the two never
     land on top of each other however the blurb wraps. */
  padding: 0.7rem 0.75rem 1.75rem;
  border: 0;
  border-radius: var(--radius-card);
  background: none;
  cursor: pointer;
  text-align: left;
}

.mode-preview {
  position: absolute;
  right: 0.6rem;
  bottom: 0.5rem;
  border: 0;
  background: none;
  color: var(--color-faint);
  cursor: pointer;
  padding: 0.15rem 0.25rem;
}

.mode-preview:hover {
  color: var(--color-clay);
}

/* The previews are drawn from the same idea as the screens themselves: a black
   tile and a few lit pixels, so a mode is recognisable before it is chosen. */
.mode-art {
  position: relative;
  display: block;
  flex: none;
  width: 3.5rem;
  height: 2.25rem;
  overflow: hidden;
  border-radius: 6px;
  background: #000;
}

.mode-art i {
  position: absolute;
  display: block;
}

.mode-art[data-mode='clock'] i:nth-child(1) {
  top: 16%;
  left: 12%;
  width: 32%;
  height: 6%;
  background: var(--color-faint);
}

.mode-art[data-mode='clock'] i:nth-child(2) {
  top: 36%;
  left: 12%;
  width: 76%;
  height: 32%;
  border-radius: 2px;
  background: #ece6db;
  opacity: 0.85;
}

.mode-art[data-mode='clock'] i:nth-child(3) {
  top: 76%;
  left: 12%;
  width: 44%;
  height: 5%;
  background: var(--color-faint);
}

.mode-art[data-mode='ember'] i:nth-child(1) {
  top: 50%;
  left: 50%;
  width: 1.6rem;
  height: 1.6rem;
  margin: -0.8rem 0 0 -0.8rem;
  border-radius: 50%;
  background: radial-gradient(circle, rgb(231 150 110 / 0.4), transparent 70%);
}

.mode-art[data-mode='ember'] i:nth-child(2) {
  top: 50%;
  left: 50%;
  width: 8px;
  height: 8px;
  margin: -4px 0 0 -4px;
  border-radius: 50%;
  background: var(--color-clay-soft);
}

.mode-art i[data-star] {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: #ece6db;
}

.mode-art[data-mode='stars'] i:nth-child(1) {
  top: 22%;
  left: 20%;
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: #ece6db;
  opacity: 0.8;
}

.mode-art[data-mode='stars'] i:nth-child(2) {
  top: 56%;
  left: 46%;
  width: 2px;
  height: 2px;
  border-radius: 50%;
  background: #ece6db;
  opacity: 0.6;
}

.mode-art[data-mode='stars'] i:nth-child(3) {
  top: 30%;
  left: 74%;
  width: 2px;
  height: 2px;
  border-radius: 50%;
  background: #ece6db;
  opacity: 0.7;
}

.mode-art[data-mode='agents'] i {
  left: 16%;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--color-clay-soft);
}

.mode-art[data-mode='agents'] i:nth-child(1) {
  top: 20%;
}
.mode-art[data-mode='agents'] i:nth-child(2) {
  top: 45%;
}
.mode-art[data-mode='agents'] i:nth-child(3) {
  top: 70%;
}

.mode-art[data-mode='minimal'] i:nth-child(1) {
  bottom: 18%;
  left: 16%;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--color-clay-soft);
}
</style>
