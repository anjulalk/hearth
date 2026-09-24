// Generates the icons, the social card, the manifest, robots.txt, the sitemap
// and the CNAME from the same palette the app uses, so none of them can drift.
//
// Run from the repo root:  npm run assets
//
// The PNGs are drawn with ImageMagick (scoop install imagemagick on Windows,
// brew install imagemagick, apt install imagemagick). The shapes are written
// here rather than kept as binaries, so an icon change is a reviewable diff.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const OUT = resolve('public')
const SITE = 'https://hearth.anjula.dev'
const NAME = 'hearth'

const PAPER = '#faf8f3'
const INK = '#44403a'
const MUTE = '#5f5a51'
const SOFT = '#767064'
const CLAY = '#c1603c'
const CLAY_SOFT = '#e7966e'
const LINE = '#dfdbd0'
const TILE = '#26241f'

const SERIF_FONTS = [
  'C:/Windows/Fonts/georgia.ttf',
  '/System/Library/Fonts/Supplemental/Georgia.ttf',
  '/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf',
]
const MONO_FONTS = [
  'C:/Windows/Fonts/consola.ttf',
  '/System/Library/Fonts/Menlo.ttc',
  '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf',
]

const firstExisting = (paths: string[]): string | undefined =>
  paths.find((path) => existsSync(path))

let magick = false
try {
  execFileSync('magick', ['-version'], { stdio: 'ignore' })
  magick = true
} catch {
  console.warn(
    'ImageMagick was not found, so the PNGs were left as they are. The SVG, the manifest and the text files are still written.',
  )
}

function draw(args: string[], out: string): void {
  if (!magick) return
  execFileSync('magick', [...args, out], { stdio: 'inherit' })
  console.log(out.replace(/\\/g, '/'))
}

/**
 * A soft ember glow. ImageMagick has no gradients in -draw, so this stacks
 * translucent rings, which is close enough at this size and impossible to
 * drift from the palette.
 */
function ember(size: number): string {
  const centre = size / 2
  const steps = 20
  const reach = size * 0.36
  const rings: string[] = []
  for (let index = steps; index >= 1; index -= 1) {
    const radius = (reach * index) / steps
    rings.push(`fill rgba(231,150,110,0.035) circle ${centre},${centre} ${centre + radius},${centre}`)
  }
  const core = size * 0.115
  const spark = size * 0.045
  const sparkX = centre - core * 0.36
  rings.push(`fill ${CLAY_SOFT} circle ${centre},${centre} ${centre + core},${centre}`)
  rings.push(
    `fill #f6d3b6 circle ${sparkX},${sparkX} ${sparkX + spark},${sparkX}`,
  )
  return rings.join(' ')
}

function iconArgs(size: number, rounded: boolean): string[] {
  const args = ['-size', `${size}x${size}`, 'xc:none', '-fill', TILE]
  if (rounded) {
    const radius = Math.round(size * 0.22)
    args.push('-draw', `roundrectangle 0,0 ${size - 1},${size - 1} ${radius},${radius}`)
  } else {
    args.push('-draw', `rectangle 0,0 ${size - 1},${size - 1}`)
  }
  args.push('-draw', ember(size))
  return args
}

function glow(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  rgb: string,
  alpha: number,
  steps = 20,
): string {
  const rings: string[] = []
  for (let index = steps; index >= 1; index -= 1) {
    const sx = Math.round((rx * index) / steps)
    const sy = Math.round((ry * index) / steps)
    rings.push(`fill rgba(${rgb},${alpha}) ellipse ${cx},${cy} ${sx},${sy} 0,360`)
  }
  return rings.join(' ')
}

function socialCard(): void {
  const serif = firstExisting(SERIF_FONTS)
  const mono = firstExisting(MONO_FONTS)
  const args = ['-size', '1200x630', `xc:${PAPER}`]

  // The ambient wash, then the hairline frame the printed page carries.
  args.push('-draw', glow(90, -30, 760, 420, '193,96,60', 0.014))
  args.push('-draw', glow(1130, -20, 620, 360, '120,135,106', 0.012))
  args.push(
    '-stroke',
    LINE,
    '-strokewidth',
    '1',
    '-fill',
    'none',
    '-draw',
    'rectangle 0.5,0.5 1199.5,629.5',
    '-stroke',
    'none',
  )

  // The ember, large, on the right.
  args.push('-draw', glow(1010, 315, 190, 190, '231,150,110', 0.05))
  args.push('-fill', CLAY_SOFT, '-draw', 'circle 1010,315 1010,247')
  args.push('-fill', '#f6d3b6', '-draw', 'circle 987,292 987,272')

  if (serif) {
    args.push('-font', serif, '-fill', INK, '-pointsize', '84')
    args.push('-annotate', '+74+300', 'Keep the screen on')
    args.push('-annotate', '+74+398', 'while the agents work')
    args.push('-font', serif, '-fill', MUTE, '-pointsize', '26')
    args.push('-annotate', '+76+462', 'A screen wake lock, an inaudible media stream')
    args.push('-annotate', '+76+500', 'and a black screensaver.')
  }
  if (mono) {
    args.push('-font', mono, '-fill', SOFT, '-pointsize', '20', '-kerning', '9')
    args.push('-annotate', '+76+104', NAME.toUpperCase())
    args.push('-kerning', '0', '-fill', SOFT, '-pointsize', '20')
    args.push('-annotate', '+76+580', `${NAME}.anjula.dev`)
  }
  args.push('-fill', CLAY, '-draw', 'rectangle 76,528 226,534')

  draw(args, resolve(OUT, 'og.png'))
}

/** The same mark the app draws in the tab, kept in step with src/lib/favicon.ts. */
function faviconSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${CLAY_SOFT}" stop-opacity="0.55" />
      <stop offset="55%" stop-color="${CLAY_SOFT}" stop-opacity="0.18" />
      <stop offset="100%" stop-color="${CLAY_SOFT}" stop-opacity="0" />
    </radialGradient>
  </defs>
  <rect width="64" height="64" rx="14" fill="${TILE}" />
  <circle cx="32" cy="32" r="23" fill="url(#glow)" />
  <circle cx="32" cy="32" r="7.5" fill="${CLAY_SOFT}" />
  <circle cx="29.4" cy="29" r="2.3" fill="#f6d3b6" />
</svg>
`
}

mkdirSync(OUT, { recursive: true })

writeFileSync(resolve(OUT, 'favicon.svg'), faviconSvg())
writeFileSync(
  resolve(OUT, 'site.webmanifest'),
  JSON.stringify(
    {
      name: 'hearth - keep the screen on while agents run',
      short_name: NAME,
      description:
        'Holds a screen wake lock and an inaudible media stream so the display stays on while agents run, with a black, low-power screensaver.',
      start_url: '/?start=1',
      scope: '/',
      display: 'standalone',
      background_color: '#000000',
      theme_color: '#000000',
      icons: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    null,
    2,
  ) + '\n',
)
writeFileSync(resolve(OUT, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`)
writeFileSync(
  resolve(OUT, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE}/</loc>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`,
)
writeFileSync(resolve(OUT, 'CNAME'), `${SITE.replace('https://', '')}\n`)

draw(iconArgs(512, true), resolve(OUT, 'icon-512.png'))
draw([...iconArgs(512, true), '-resize', '192x192'], resolve(OUT, 'icon-192.png'))
draw([...iconArgs(512, false), '-resize', '512x512'], resolve(OUT, 'icon-maskable-512.png'))
draw([...iconArgs(512, false), '-resize', '180x180'], resolve(OUT, 'apple-touch-icon.png'))
socialCard()

console.log('wrote favicon.svg, the icons, og.png, site.webmanifest, robots.txt, sitemap.xml, CNAME')
