export interface ClockParts {
  /** `09` or `21`, always two digits so the clock does not shift. */
  hour: string
  minute: string
  seconds: string
  meridiem: string
  /** `09:04` or `21:04`, for places that render the time in one piece. */
  time: string
}

export function pad(value: number): string {
  return value < 10 ? `0${value}` : String(value)
}

export function clockParts(date: Date, hour24: boolean): ClockParts {
  const hours = date.getHours()
  const minutes = pad(date.getMinutes())
  const seconds = pad(date.getSeconds())
  if (hour24) {
    const hour = pad(hours)
    return { hour, minute: minutes, seconds, meridiem: '', time: `${hour}:${minutes}` }
  }
  const hour12 = hours % 12 === 0 ? 12 : hours % 12
  const hour = pad(hour12)
  return {
    hour,
    minute: minutes,
    seconds,
    meridiem: hours < 12 ? 'AM' : 'PM',
    time: `${hour}:${minutes}`,
  }
}

export function dateLine(date: Date, locale?: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date)
}

/** `3h 12m`, `4m 05s`, `48s`. */
export function elapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  if (hours > 0) return `${hours}h ${pad(minutes)}m`
  if (minutes > 0) return `${minutes}m ${pad(seconds)}s`
  return `${seconds}s`
}

/** The same, trimmed for a screensaver: seconds stop mattering after a while. */
export function elapsedShort(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  if (hours > 0) return `${hours}h ${pad(minutes)}m`
  if (minutes > 0) return `${minutes}m`
  return `${total}s`
}

export function percent(level: number): string {
  return `${Math.round(Math.min(1, Math.max(0, level)) * 100)}%`
}
