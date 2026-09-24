/** The lit, dim and out ember: the one glanceable signal that survives a tab
 *  strip, because it lives in the favicon while the tab is in the background. */
export type EmberState = 'lit' | 'dim' | 'out'

const TILE = '#26241f'
const EMBER = '#e7966e'
const CORE = { lit: '#f0b48d', dim: '#a05f3f', out: '#4c4841' } as const
const GLOW = { lit: 0.55, dim: 0.18, out: 0 } as const

function emberSvg(state: EmberState): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
<defs><radialGradient id="g" cx="50%" cy="50%" r="50%">
<stop offset="0%" stop-color="${EMBER}" stop-opacity="${GLOW[state]}"/>
<stop offset="55%" stop-color="${EMBER}" stop-opacity="${(GLOW[state] * 0.45).toFixed(3)}"/>
<stop offset="100%" stop-color="${EMBER}" stop-opacity="0"/>
</radialGradient></defs>
<rect width="64" height="64" rx="14" fill="${TILE}"/>
<circle cx="32" cy="32" r="21" fill="url(#g)"/>
<circle cx="32" cy="32" r="7" fill="${CORE[state]}"/>
</svg>`
}

export function setFavicon(state: EmberState): void {
  const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
  if (!link) return
  link.href = `data:image/svg+xml,${encodeURIComponent(emberSvg(state))}`
}
