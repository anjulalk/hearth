import { computed, createApp, inject, reactive, ref, watch, watchEffect, type InjectionKey } from 'vue'
import MiniStage from '@/components/MiniStage.vue'
import { Hearth, type AwakeState } from './awake'
import { holdStatus, type HoldLevel, type HoldStatus } from './holds'
import { modeDef, nextMode, rotatedMode } from './modes'
import { clampAgents, parseOptions, type DimTier, type ModeId } from './params'
import {
  localStore,
  readAppearance,
  readPrefs,
  writeAppearance,
  writePrefs,
  type Appearance,
  type Prefs,
} from './prefs'
import { addWatch, clearSession, readSession, readWatch, writeSession, type WatchDay } from './stats'
import { setFavicon } from './favicon'
import { useBattery } from './battery'
import { MiniWindow, type MiniReport } from './mini'
import { useNow } from './useNow'

const TITLE = 'Keep your screen on while AI agents run | hearth'
const DIM_ORDER: readonly DimTier[] = ['gentle', 'deep', 'off']
/** Small offsets, on purpose: a panel notices a pattern that never moves. */
const SHIFT_STEPS: ReadonlyArray<readonly [number, number]> = [
  [0, 0],
  [6, 6],
  [-6, 4],
  [4, -6],
  [-6, -4],
  [7, -2],
  [-4, 7],
  [2, -7],
  [-7, 7],
]

export function createStore() {
  const prefs = reactive<Prefs>(readPrefs())
  const appearance = ref<Appearance>(readAppearance())
  const url = parseOptions(location.search, location.hash)
  if (url.mode) prefs.mode = url.mode
  if (url.dim) prefs.dim = url.dim
  if (url.seconds !== undefined) prefs.seconds = url.seconds
  if (url.rotate !== undefined) prefs.rotate = url.rotate
  if (url.agents !== undefined) prefs.agents = clampAgents(url.agents)

  const awakeState = reactive<AwakeState>({
    running: false,
    startedAt: null,
    wakeLock: 'idle',
    wakeLockError: null,
    media: 'off',
    mediaError: null,
    visible: document.visibilityState === 'visible',
    needsGesture: false,
    hiddenMs: 0,
    hiddenSince: null,
    lockMs: 0,
    lockSince: null,
  })
  const miniReport = reactive<MiniReport>({ state: 'off', message: null, lockHeld: false })
  const preview = ref(false)
  const previewStartedAt = ref(Date.now())
  const lastActivity = ref(Date.now())
  const controlsVisible = ref(false)
  const shift = reactive({ x: 0, y: 0 })
  const day = ref<WatchDay>(readWatch(localStore()))
  const fullscreen = ref(document.fullscreenElement !== null)
  const battery = useBattery()

  const awake = new Hearth({
    media: prefs.media,
    onState: (state) => Object.assign(awakeState, state),
    onStop: (elapsedMs) => {
      day.value = addWatch(elapsedMs, localStore())
      clearSession(localStore())
    },
  })

  const mini = new MiniWindow({ onReport: (report) => Object.assign(miniReport, report) })

  const running = computed(() => awakeState.running)

  const hold = computed<HoldStatus>(() =>
    holdStatus({
      running: awakeState.running,
      visible: awakeState.visible,
      wakeLock: awakeState.wakeLock,
      media: awakeState.media,
      needsGesture: awakeState.needsGesture,
      miniHeld: miniReport.lockHeld,
    }),
  )

  // The ticker reads the settings, never the derived mode, so it cannot circle
  // back to itself. Rotation needs a second's resolution because it can land on
  // the clock.
  const tickMs = computed(() => {
    if (!awakeState.running && !preview.value) return 0
    return prefs.rotate ? 1000 : modeDef(prefs.mode).tickMs
  })
  const now = useNow(tickMs)

  const mode = computed<ModeId>(() =>
    prefs.rotate && awakeState.running ? rotatedMode(prefs.mode, elapsedMs.value) : prefs.mode,
  )

  const elapsedMs = computed(() => {
    const startedAt = awakeState.running
      ? awakeState.startedAt
      : preview.value
        ? previewStartedAt.value
        : null
    return startedAt === null ? 0 : Math.max(0, now.value - startedAt)
  })

  const backgroundMs = computed(
    () =>
      awakeState.hiddenMs +
      (awakeState.hiddenSince === null ? 0 : Math.max(0, now.value - awakeState.hiddenSince)),
  )

  const lockedMs = computed(
    () =>
      awakeState.lockMs +
      (awakeState.lockSince === null ? 0 : Math.max(0, now.value - awakeState.lockSince)),
  )

  const dayMs = computed(() => day.value.ms + (awakeState.running ? elapsedMs.value : 0))

  const dimTier = computed(() => {
    if (!awakeState.running || prefs.dim === 'off') return 0
    const idleMinutes = Math.max(0, now.value - lastActivity.value) / 60_000
    if (prefs.dim === 'gentle') return idleMinutes >= 15 ? 2 : idleMinutes >= 3 ? 1 : 0
    return idleMinutes >= 20 ? 3 : idleMinutes >= 5 ? 2 : idleMinutes >= 1 ? 1 : 0
  })

  // --- pixel shift and the controls timer --------------------------------
  let shiftTimer: number | undefined
  let shiftStep = 0
  let hideTimer: number | undefined

  function applyShift(): void {
    if (shiftTimer !== undefined) {
      clearInterval(shiftTimer)
      shiftTimer = undefined
    }
    if (!awakeState.running || !prefs.pixelShift) {
      shift.x = 0
      shift.y = 0
      return
    }
    shiftTimer = window.setInterval(() => {
      shiftStep = (shiftStep + 1) % SHIFT_STEPS.length
      const step = SHIFT_STEPS[shiftStep] ?? ([0, 0] as const)
      shift.x = step[0]
      shift.y = step[1]
    }, 120_000)
  }

  function revealControls(): void {
    controlsVisible.value = true
    if (hideTimer !== undefined) clearTimeout(hideTimer)
    hideTimer = window.setTimeout(() => {
      controlsVisible.value = false
    }, 4000)
  }

  function touch(): void {
    lastActivity.value = Date.now()
    if (!awakeState.running && !preview.value) return
    revealControls()
  }

  /**
   * Pointer moves arrive by the hundred, so the idle timer only takes a second's
   * resolution. The controls themselves are a different matter: the first move
   * after the watch starts has to bring them back, whatever the timer says.
   */
  function markActivity(): void {
    const active = awakeState.running || preview.value
    if (active && !controlsVisible.value) revealControls()
    if (Date.now() - lastActivity.value < 1000) return
    lastActivity.value = Date.now()
    if (active) revealControls()
  }

  function showControls(): void {
    controlsVisible.value = true
    touch()
  }

  // --- appearance --------------------------------------------------------
  const darkQuery = window.matchMedia('(prefers-color-scheme: dark)')

  function applyAppearance(): void {
    const dark = appearance.value === 'dark' || (appearance.value === 'auto' && darkQuery.matches)
    document.documentElement.classList.toggle('dark', dark)
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    if (meta) meta.content = awakeState.running ? '#000000' : dark ? '#282622' : '#faf8f3'
  }

  // --- actions -----------------------------------------------------------
  async function enterFullscreen(): Promise<void> {
    if (document.fullscreenElement) return
    try {
      await document.documentElement.requestFullscreen()
    } catch {
      /* a browser can refuse, and that is not worth a message */
    }
  }

  async function exitFullscreen(): Promise<void> {
    if (!document.fullscreenElement) return
    try {
      await document.exitFullscreen()
    } catch {
      /* already out */
    }
  }

  async function toggleFullscreen(): Promise<void> {
    if (document.fullscreenElement) await exitFullscreen()
    else await enterFullscreen()
  }

  async function openMini(): Promise<void> {
    await mini.open((root) => {
      const app = createApp(MiniStage, miniProps)
      app.mount(root)
      return () => app.unmount()
    })
  }

  function toggleMini(): void {
    if (mini.isOpen()) mini.close()
    else void openMini()
  }

  /**
   * `?start=1` is safe to click twice: the session's start is kept, so a
   * bookmark that lands while the watch is already running continues it.
   */
  async function start(origin: 'user' | 'auto' = 'user'): Promise<void> {
    if (awake.isRunning()) return
    const startedAt = readSession(localStore()) ?? Date.now()
    writeSession(startedAt, localStore())
    preview.value = false
    lastActivity.value = Date.now()
    controlsVisible.value = false
    await awake.start(startedAt)
    if (origin !== 'user') return
    // The mini window is the stronger hold, so it replaces fullscreen rather
    // than fighting it.
    if (prefs.miniWindow && MiniWindow.supported()) await openMini()
    else if (prefs.fullscreen) await enterFullscreen()
  }

  async function stop(): Promise<void> {
    await awake.stop()
    if (mini.isOpen()) mini.close()
    controlsVisible.value = false
    await exitFullscreen()
  }

  async function toggle(): Promise<void> {
    if (awake.isRunning()) await stop()
    else await start()
  }

  function startPreview(target?: ModeId): void {
    if (target) prefs.mode = target
    if (preview.value) {
      preview.value = false
      return
    }
    previewStartedAt.value = Date.now()
    preview.value = true
    lastActivity.value = Date.now()
  }

  function endPreview(): void {
    preview.value = false
  }

  function cycleMode(): void {
    prefs.mode = nextMode(mode.value)
  }

  function cycleDim(): void {
    const index = DIM_ORDER.indexOf(prefs.dim)
    prefs.dim = DIM_ORDER[(index + 1) % DIM_ORDER.length] ?? 'gentle'
  }

  const miniProps = reactive({
    mode: 'clock' as ModeId,
    startedAt: Date.now(),
    holdLevel: 'off' as HoldLevel,
    short: 'not holding',
    running: false,
    visible: true,
    warm: true,
    hour24: true,
    seconds: false,
    agents: 3,
    onCycle: () => cycleMode(),
  })

  // --- wiring ------------------------------------------------------------
  const onFullscreenChange = (): void => {
    fullscreen.value = document.fullscreenElement !== null
  }

  function attach(): void {
    window.addEventListener('pointermove', markActivity, { passive: true })
    window.addEventListener('pointerdown', markActivity, { passive: true })
    window.addEventListener('wheel', markActivity, { passive: true })
    window.addEventListener('touchstart', markActivity, { passive: true })
    window.addEventListener('keydown', markActivity)
    document.addEventListener('fullscreenchange', onFullscreenChange)
    darkQuery.addEventListener('change', applyAppearance)
  }

  function dispose(): void {
    window.removeEventListener('pointermove', markActivity)
    window.removeEventListener('pointerdown', markActivity)
    window.removeEventListener('wheel', markActivity)
    window.removeEventListener('touchstart', markActivity)
    window.removeEventListener('keydown', markActivity)
    document.removeEventListener('fullscreenchange', onFullscreenChange)
    darkQuery.removeEventListener('change', applyAppearance)
    if (shiftTimer !== undefined) clearInterval(shiftTimer)
    if (hideTimer !== undefined) clearTimeout(hideTimer)
    mini.close()
  }

  watch(prefs, () => writePrefs(prefs))

  watch(
    () => prefs.media,
    (value) => awake.setMedia(value),
  )

  watch([() => awakeState.running, () => prefs.pixelShift], applyShift, { immediate: true })

  watch(appearance, (value) => {
    writeAppearance(value)
    applyAppearance()
  })

  watchEffect(() => {
    const status = hold.value
    setFavicon(status.level === 'screen' ? 'lit' : status.level === 'media' ? 'dim' : 'out')
    document.title = status.level === 'off' ? TITLE : `${status.short} · hearth`
  })

  watchEffect(() => {
    miniProps.mode = mode.value
    miniProps.startedAt = awakeState.startedAt ?? previewStartedAt.value
    miniProps.holdLevel = hold.value.level
    miniProps.short = hold.value.short
    miniProps.running = awakeState.running
    miniProps.visible = awakeState.visible
    miniProps.warm = prefs.warm
    miniProps.hour24 = prefs.hour24
    miniProps.seconds = prefs.seconds
    miniProps.agents = prefs.agents
  })

  watchEffect(applyAppearance)

  return {
    prefs,
    appearance,
    autoStart: url.start === true,
    awakeState,
    battery,
    backgroundMs,
    controlsVisible,
    dayMs,
    dimTier,
    elapsedMs,
    fullscreen,
    hold,
    lockedMs,
    miniReport,
    miniSupported: MiniWindow.supported(),
    mode,
    now,
    preview,
    running,
    shift,
    attach,
    cycleDim,
    cycleMode,
    dispose,
    endPreview,
    openMini,
    setAgents: (value: number) => {
      prefs.agents = clampAgents(value)
    },
    setMode: (value: ModeId) => {
      prefs.mode = value
    },
    showControls,
    start,
    startPreview,
    stop,
    toggle,
    toggleFullscreen,
    toggleMini,
  }
}

export type Store = ReturnType<typeof createStore>

export const STORE_KEY: InjectionKey<Store> = Symbol('hearth.store')

export function useStore(): Store {
  const store = inject(STORE_KEY)
  if (!store) throw new Error('hearth: the store was not provided')
  return store
}
