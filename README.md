# hearth

[![ci](https://github.com/anjulalk/hearth/actions/workflows/ci.yml/badge.svg)](https://github.com/anjulalk/hearth/actions/workflows/ci.yml)
[![deploy](https://github.com/anjulalk/hearth/actions/workflows/deploy.yml/badge.svg)](https://github.com/anjulalk/hearth/actions/workflows/deploy.yml)
[![release](https://github.com/anjulalk/hearth/actions/workflows/release.yml/badge.svg)](https://github.com/anjulalk/hearth/actions/workflows/release.yml)
[![version](https://img.shields.io/github/v/release/anjulalk/hearth?labelColor=44403a&color=c1603c&style=flat-square)](https://github.com/anjulalk/hearth/releases)
[![live](https://img.shields.io/badge/live-hearth.anjula.dev-5f5a51?labelColor=44403a&style=flat-square)](https://hearth.anjula.dev)
[![license](https://img.shields.io/badge/license-MIT-44403a?style=flat-square)](LICENSE)

**hearth** keeps a screen on while a long job runs, and puts something calm on it while
you wait. It is a web app: no install, no account, no server. A screen wake lock, an
inaudible media stream, and a true black screensaver with a clock, an ember, a star
field, or a tally of the agents at work.

Live at <https://hearth.anjula.dev>. One bookmark starts the whole thing.

## Why

Running AI agents means waiting. The jobs are long, they are often in another tab, and
the machine decides the screen has been idle and goes to sleep. That is the wrong time to
sleep: a display that has dimmed is how you lose the last five minutes of a job to a
locked screen.

hearth holds the screen on, and it does it honestly. It tells you which of its two holds
is carrying the watch right now, and it never pretends a web page can change a power
plan.

## How it holds the screen on

| Hold | What it is | When it works |
| --- | --- | --- |
| Screen wake lock | `navigator.wakeLock.request('screen')` | While hearth's document is on screen |
| Media hold | a 2x2 canvas stream and a 40 Hz tone at about -80 dB, on a hidden video element | While the tab is in the background, because a tab that is playing media is exempt from the browser's freezer and timer throttling |
| Mini window | document picture-in-picture: a second, visible document with its own lock | Chrome and Edge, while you work in the window running the agents |

The three are complementary, not alternatives. The wake lock is the strong one and the
browser releases it the moment the tab goes away. The media hold is what carries the
watch in between. The mini window is the only way to keep the strong hold while the main
tab is in the background.

The tab title and the favicon say the same thing as the panel: the ember is lit while a
screen lock is held, dimmed while only the media stream is holding, and out when nothing
is.

**What a page cannot do.** It cannot change an operating system's power settings. If the
display or the machine still sleeps, that is the power plan, and the panel lists the
commands for each platform. The honest summary is in the app, under *Straight answers*.

## The screensaver

The stage is true black, so an OLED panel leaves those pixels off. Every mode is a
handful of lit pixels, and every animation only moves or fades, which the compositor can
do without a repaint.

| Mode | What it shows | Updates |
| --- | --- | --- |
| Clock | the time, the date, and the length of the watch | once a second, or once a minute with seconds off |
| Ember | one small fire, breathing | CSS animation only |
| Stars | dim points drifting upward in three slow layers | CSS animation only |
| Agents | a count of the jobs, each breathing on its own schedule | once every 45 seconds |
| Minimal | a dot and the elapsed time, black almost everywhere | once every five seconds |

Four things keep a panel out of trouble, all on by default except rotation: the whole
stage shifts a few pixels every two minutes, the dim steps fall away while nobody is
there, rotation walks through the modes every ten minutes, and the palette is warm
rather than white. There is no animation frame loop anywhere in the app; the only
recurring timer stops entirely while the tab is hidden.

## Quick start

- **Bookmark**: drag the *Wake the hearth* link from the panel to your bookmarks bar. It
  opens hearth with `?start=1`, and opening it again continues the same watch instead of
  restarting the clock.
- **Link**: `https://hearth.anjula.dev/?start=1`. `#start` works too, and a link can carry
  `?mode=stars`, `?agents=5`, `?dim=deep` or `?mode=rotate`.
- **App**: install it from the browser menu. The service worker keeps the shell, so it
  opens offline.

| Key | What it does |
| --- | --- |
| `Space` | start or stop the watch |
| `M` | next screensaver |
| `D` | next dim step |
| `F` | fullscreen |
| `N` | mini window |
| `Esc` | leave fullscreen, or a preview |

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server on <http://localhost:5174> |
| `npm run build` | typecheck, then the production build into `dist/` |
| `npm run check` | `vue-tsc` over the app, the tests and the scripts |
| `npm test` | unit tests, Vitest |
| `npm run test:e2e` | build, then the interface tests, Playwright |
| `npm run test:e2e:update` | the same, rewriting the screenshot baselines |
| `npm run smoke` | handshake with the deployed site, after a deploy |
| `npm run assets` | the icons, the social card, the manifest, the CNAME (needs ImageMagick) |

## Tests

**Unit tests** cover the parts that are worth proving without a browser: the link
options, the clock and duration formatting, the mode rotation, the day's total, and the
one function that decides which hold the UI reports.

**Interface tests** run the built site in Chromium at a fixed minute, with a fixed wake
lock and battery. They check behaviour (the media stream really has a video and an audio
track, the keyboard drives the stage, dimming follows the clock, the pixel shift moves,
stopping clears the session) and they compare screenshots: the stage and every screensaver
against baselines, on every platform. The two full page panel screenshots are generated on
the runner, because a long page of prose wraps a line or two differently on Windows than on
Linux, and no pixel tolerance can tell that apart from antialiasing.

```bash
npx playwright install chromium   # once
npm run test:e2e
```

**Live check.** `npm run smoke` loads <https://hearth.anjula.dev/?start=1> in a real browser
and asserts what only production can show: the domain answers, the stage is black, the media
stream has both of its tracks and is playing, the tab title reports the hold, the service
worker is registered, and a reload continues the watch instead of restarting it. It exits
non-zero, so it works as a post-deploy gate.

## Deployment

GitHub Pages serves the repository root of the custom subdomain. The workflow builds
with `BASE_PATH=/`, and `public/CNAME` carries the domain.

Two things are made by hand once, in the repository settings: **Pages source** must be
GitHub Actions, and the **custom domain** must be set under Pages. The workflow token
answers 403 to the Pages settings API, so it cannot do either. The DNS record at
Cloudflare points `hearth.anjula.dev` at GitHub, the way the other subdomains do.

## Privacy

Nothing leaves the page. There is no analytics and no account, and the type is served from this
origin rather than a font host, so after the files load there are no outside requests at all. The
mode, the settings and the day's total live in your own local storage, and nowhere else. The
service worker keeps the shell and the fonts, so hearth opens with no network either.

## License

MIT. Built by [Anjula Karunarathne](https://anjula.dev). The palette and the type are the
shared design system, published at <https://anjula.dev/design/tokens.css>.
