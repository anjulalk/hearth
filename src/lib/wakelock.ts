/** The slice of the Screen Wake Lock API this app uses, typed locally so the
 *  build does not depend on how new the TypeScript DOM lib is. */
export interface WakeLockSentinelLike extends EventTarget {
  released: boolean
  release(): Promise<void>
}

export interface WakeLockLike {
  request(type?: 'screen'): Promise<WakeLockSentinelLike>
}

export function wakeLockApi(nav: Navigator): WakeLockLike | null {
  const value = (nav as Navigator & { wakeLock?: WakeLockLike }).wakeLock
  return value ?? null
}
