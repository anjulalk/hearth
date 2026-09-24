import { onBeforeUnmount, ref, watch, type Ref } from 'vue'

/**
 * The app's clock. It stops while the tab is hidden, because nothing is on
 * screen then and every value it feeds is derived from a timestamp, so it is
 * correct again on the first tick after the tab returns. This is the only
 * recurring timer in the app.
 */
export function useNow(interval: Ref<number> | (() => number)): Ref<number> {
  const now = ref(Date.now())
  let timer: number | undefined

  const read = (): number => (typeof interval === 'function' ? interval() : interval.value)

  const stop = (): void => {
    if (timer !== undefined) {
      clearInterval(timer)
      timer = undefined
    }
  }

  const start = (): void => {
    stop()
    const ms = read()
    if (ms <= 0 || document.hidden) return
    timer = window.setInterval(() => {
      now.value = Date.now()
    }, ms)
  }

  watch(read, start, { immediate: true })

  const onVisibility = (): void => {
    now.value = Date.now()
    start()
  }
  document.addEventListener('visibilitychange', onVisibility)

  onBeforeUnmount(() => {
    stop()
    document.removeEventListener('visibilitychange', onVisibility)
  })

  return now
}
