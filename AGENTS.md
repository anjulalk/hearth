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
| `npm run verify:headed` | the wake lock and the mini window, in a real window |
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

## The shell

The panel follows `DESIGN.md`'s Page shell, and the black stage is the one exception.

- **Header**: the wordmark is Inter 600 at 1.25rem in `--ink`, on a 1.2 line with `-0.011em`
  tracking, with the ember mark after it, and the status line on the right: a small dot, the hold
  in a word, and how long it has been kept. The status is header meta, so Inter 0.875rem in
  `--ink-500`, never a colour on its own. `padding-block` 1.5rem, 2.5rem from 640px. On a phone the
  brand takes its own full-width line and the status sits beneath it. The numbers are read off
  anjula.dev; matching them is what keeps the header from looking cramped.
- **Intro**: a lede in `--ink` at 1.125rem on a 1.75rem line, then a supporting line in
  `--ink-700`, `margin-top` 1.25rem, `max-width` 42rem. **The OLED promise leads**: the lede says
  true black, the supporting line says why. No eyebrow and no display headline.
- **Footer**: Inter throughout, `--text-sm` in `--ink-500`, one `--text-xs` line under it (the
  source links), the appearance control as a 3rem square on the right, `padding-block` 2.5rem with
  3rem above it, and **no rule above it**. No licence and no disclaimer: hearth does not help anyone
  make a decision.
- **Copy stays short.** One line of truth per idea: a hold's detail, a setting's blurb, a FAQ
  answer. Long text is what makes an app feel like homework.
- **The modes are one control**, in the status card and on the stage bar: `Screensaver`, `Panel`,
  `Mini window`, with `Fullscreen` beside them. The mini window is a mode, not a settings toggle,
  and fullscreen belongs to the screensaver so it is disabled for the other two. Switching a mode
  while the watch runs takes effect at once: that is what `setView` is for. The old `miniWindow`
  boolean is migrated to `whileRunning: 'mini'`.
- **Two controls on the stage bar are joined**: the mode switch, and the split button whose name
  half advances the screensaver while its chevron opens the list. An open menu keeps the bar up,
  which is what `pinControls` is for.
- **The regular screen is never more than one click away** from the screensaver, and fullscreen is
  never taken on its own: `fullscreenOnStart` is off by default and starting the watch must not grab
  the screen.
- **Accent**: never a solid fill with white text. White on `--clay` is 4.2:1 in light and about
  2:1 on the lighter dark-mode accent, and the system's floor is 4.5:1, so a primary action is
  clay text on a clay tint (`color-mix` at 10%, border at 45%).
- **Type scale**: only 0.75, 0.875, 1, 1.125, 1.25, 1.5, 2.25 and 3.75rem exist. 13px and 15px
  do not: a hint or a caption is `text-sm`, a control label or interface body is `text-base`.
  No arbitrary `text-[…rem]` values in markup.

## The two holds

The screen wake lock is the strong one, and a browser grants it only to a document that is
on screen. The media hold is a 2x2 canvas stream plus a 40 Hz tone at about -80 dB on a
hidden video element; a tab playing media is exempt from Chromium's background freezer
and from timer throttling. The mini window is a second visible document, which is the only
way to keep the strong hold while the user works in the agents' window.

A lock that goes away comes back: `awake.ts` asks again, with a backoff, on
`visibilitychange`, on `pageshow` and `focus`, and on the page lifecycle's `resume`, because
a system suspend can take the lock without the page ever going hidden. The interface tests
release a stubbed lock and watch the retry.

A watch that goes away comes back too. `hearth.session` holds `startedAt` and `seenAt`; the
second is touched whenever the page hides or unloads, so a reload resumes the same watch while
a gap of more than five minutes starts a new one. Stopping clears the session, which is what
stops the restore.

## Deploy

GitHub Pages, from the workflow. Two repository settings are made once, and both can be
made with the API here: Pages source is `workflow`, and the custom domain is set with
`gh api -X PUT /repos/<owner>/hearth/pages -f cname=hearth.anjula.dev`. The CNAME is in
`public/`. `https_enforced` waits on a GitHub certificate that a Cloudflare-proxied record
may never ask for; the site is served over HTTPS anyway.

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
- **Headless Chromium denies the screen wake lock** (`NotAllowedError: Wake lock permission
  request denied`), so the interface tests accept any honest hold state and report it instead
  of asserting it. `npm run verify:headed` is where the strong hold is asserted: in a real
  window the title reads `screen lock held · hearth`, the mini window reads
  `screen lock held · mini`, and it keeps that while the main tab is hidden. Run it by hand
  after touching `awake.ts` or `mini.ts`.
- The two full page screenshots are generated on the runner (`.github/workflows/baselines.yml`)
  because prose wraps differently between platforms. Everything else is compared on every
  platform.
