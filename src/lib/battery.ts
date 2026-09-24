import { onBeforeUnmount, ref, type Ref } from 'vue'

export interface BatteryState {
  supported: boolean
  level: number
  charging: boolean
}

interface BatteryLike extends EventTarget {
  level: number
  charging: boolean
}

interface NavigatorWithBattery extends Navigator {
  getBattery?: () => Promise<BatteryLike>
}

/** Chrome and Edge only, and worth showing: a display held on costs the battery. */
export function useBattery(): Ref<BatteryState> {
  const state = ref<BatteryState>({ supported: false, level: 1, charging: true })
  let battery: BatteryLike | null = null

  const update = (): void => {
    if (!battery) return
    state.value = { supported: true, level: battery.level, charging: battery.charging }
  }

  const nav = navigator as NavigatorWithBattery
  if (typeof nav.getBattery === 'function') {
    void nav
      .getBattery()
      .then((value) => {
        battery = value
        update()
        value.addEventListener('levelchange', update)
        value.addEventListener('chargingchange', update)
      })
      .catch(() => undefined)
  }

  onBeforeUnmount(() => {
    if (!battery) return
    battery.removeEventListener('levelchange', update)
    battery.removeEventListener('chargingchange', update)
  })

  return state
}
