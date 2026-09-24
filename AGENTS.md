# AGENTS.md

hearth is a single page web app that keeps a screen on while a long job runs, usually AI
agents in another tab. It holds a screen wake lock and an inaudible media stream, reports
which of them is doing the work, and puts a true black screensaver on the display so an
OLED panel is not asked to light a bright page for six hours.

Live at <https://hearth.anjula.dev>. There is no server and no database.

## Layout

```
src/lib/       the parts worth testing without a browser
  awake.ts       the two holds: the screen wake lock and the media stream
  holds.ts       the one function that decides which hold the UI reports
  mini.ts        the document picture-in-picture window and its own lock
  store.ts       the single shared state every surface reads from
  params.ts      link options (?start=1, #stars, ?agents=5)
src/screens/   the stage and its five screensavers
src/components/ the paper panel around them
e2e/           Playwright: behaviour plus screenshot baselines
test/          Vitest: the pure logic
public/        generated assets, the service worker, the CNAME
```

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server on port 5174 |
| `npm run check` | `vue-tsc` over app, tests, e2e and scripts |
| `npm test` | Vitest |
| `npm run test:e2e` | builds, then Playwright |
| `npm run test:e2e:update` | builds, then rewrites the screenshot baselines |
| `npm run smoke` | the deployed site, over the real domain, after a deploy |
| `npm run assets` | icons, social card, manifest, CNAME (ImageMagick) |

Always run `npm run check` and `npm test` before committing. `npm run test:e2e` rebuilds
first on purpose: an interface test against a stale `dist/` is worse than no test.

## What must not bend

- **No animation frame loop.** The stage is CSS animations on transform and opacity only,
  so the compositor does the work. The one recurring timer is a per mode tick that stops
  when the tab is hidden. If a change needs `requestAnimationFrame`, the change is wrong.
- **The stage stays `#000`.** Not near black, not a dark grey. Every value in the
  screensaver palette sits on true black, which is the whole point on an OLED panel.
- **No pure white text on the stage.** The ivory and the amber exist because white on
  black is harsh at night and lights more of the panel than it needs to.
- **`holds.ts` is the only place that decides the story.** The panel, the tab title, the
  favicon, the stage and the mini window must never disagree about which hold is active.
  Change the copy there, not in five components.
- **No analytics, no network after load.** The fonts are served from this origin, and the service
  worker keeps the shell. There is nothing left to fetch.
- **A bookmark is safe to press twice.** `?start=1` continues an existing session through
  `hearth.session`; stopping clears it. Do not break either half of that.
- **Do not claim more than a page can do.** A page cannot change a power plan, and the
  copy says so. Keep it that way.

## The two holds

The screen wake lock is the strong one, and a browser grants it only to a document that is
on screen. The media hold is a 2x2 canvas stream plus a 40 Hz tone at about -80 dB on a
hidden video element; a tab playing media is exempt from Chromium's background freezer
and from timer throttling. The mini window is a second visible document, which is the only
way to keep the strong hold while the user works in the agents' window.

## Deploy

GitHub Pages, from the workflow. Two settings are made by hand once: Pages source must be
GitHub Actions, and the custom domain is set under Pages (the workflow token gets 403 from
the Pages settings API). The CNAME is in `public/`.

## Releases

`.github/workflows/release.yml` bumps `VERSION` and `package.json`, tags, and publishes a
release. Dependabot's auto-merge workflow dispatches it after it merges a patch or minor
update, so routine updates release themselves. A person labels a pull request
`release:minor` or `release:major` for anything larger.

## Known gaps

- The mini window is Chrome and Edge only. The button hides itself elsewhere.
- The media hold is best effort for the *display* while a tab is hidden: Chromium's own
  power blocker treats audio as preventing app suspension, and the wake lock as
  preventing display sleep. That is why the panel reports the two holds separately
  instead of claiming the screen cannot sleep.
- There is no test for the mini window's own wake lock. Playwright cannot assert a real
  document picture-in-picture lock in headless Chromium; the tests cover the button's
  presence and the fallback path.
- **Headless Chromium denies the screen wake lock** (`NotAllowedError: Wake lock permission
  request denied`), so the interface tests accept any honest hold state and `npm run smoke`
  reports the state instead of asserting it. In a headed browser the lock is granted and the
  title reads `screen lock held · hearth`. Check that by hand after touching `awake.ts`, or
  with `node scripts/smoke.mts` against the live site in a headed run.
- The two full page screenshots are generated on the runner (`.github/workflows/baselines.yml`)
  because prose wraps differently between platforms. Everything else is compared on every
  platform.
