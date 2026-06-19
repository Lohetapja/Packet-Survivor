# Development Notes

Architecture and "how to extend" notes for **Cyber Defense Lab: Packet
Survivor**. Read this before adding features.

## Why classic scripts instead of ES modules

The game loads its JavaScript as ordinary `<script>` tags that all attach to a
single global namespace, `window.CDL`. It deliberately does **not** use ES
module `import`/`export`.

Reason: ES modules are fetched over HTTP and are blocked by CORS when a page is
opened via the `file://` protocol (i.e. by double-clicking `index.html`). One of
this project's hard requirements is "runs by opening `index.html` locally," so
modules would break that. Classic scripts work everywhere — `file://`, any
static server, and GitHub Pages — with **no build step**.

Trade-off: load order matters. `index.html` loads files in dependency order:

```
config → storage → enemies → tools → upgrades → waves → player → ui → game
```

`config.js` must be first (it creates `window.CDL`, `CDL.CONFIG`, and `CDL.S`).
`game.js` must be last (it boots everything and starts the loop).

## The namespace & shared state

- Everything hangs off **`window.CDL`**. Each file does
  `(function (CDL) { ... })(window.CDL);`.
- **`CDL.S`** is the single live game-state object (player, enemies, pickups,
  timers, stats, etc.). `newGame()` **mutates** `CDL.S`'s fields rather than
  replacing the object, so module references stay valid across restarts.
- **`CDL.CONFIG`** holds every tunable number. Treat it as the control panel.
- Cross-module calls happen at **runtime**, not load time, so it's fine that
  e.g. `enemies.js` calls `CDL.UI.feedMsg` even though `ui.js` loads later.

## File responsibilities

| File | Owns |
| ---- | ---- |
| `config.js` | namespace, `CONFIG` tunables, `CDL.S` state, math helpers, `freshStats()` |
| `storage.js` | `localStorage` best-score load/save (fails soft) |
| `enemies.js` | `ENEMY_TYPES`, `damageEnemy()`, enemy movement/AI, enemy rendering, `nearest()` |
| `tools.js` | `freshTools()`, tool auto-activation, projectiles, effects, tool rendering, `TOOL_META` |
| `upgrades.js` | `UPGRADES` pool, tag metadata, `buildChoices()` |
| `waves.js` | scaling multipliers, `allowedTypes()`, spawning, `nextWave()`, banner text |
| `player.js` | `create()`, movement, `gainXp()`, `hit()`, pickups, player rendering |
| `ui.js` | **all** DOM: HUD, feed, banners, overlays, upgrade cards, incident report |
| `game.js` | input, state machine, main loop, run setup, level-up flow, incident report, button wiring |

`ui.js` is the only module that touches the DOM. Game logic talks to the screen
exclusively through `CDL.UI`.

## The loop & state machine

- One `requestAnimationFrame` loop in `game.js`. `update(dt)` runs only while
  `state === "playing"`; `render()` runs for `playing | paused | levelup` (so
  the arena stays visible, frozen, behind overlays).
- `dt` is clamped to 0.05s so a backgrounded tab can't produce a huge time step.
- States: `menu → playing ⇄ paused`, `playing → levelup → playing`,
  `playing → gameover`.
- Level-ups are queued (`S.pendingLevelUps`) and the chooser is opened from the
  main loop, so multiple level-ups in one frame are handled one card at a time.

> Note: browsers pause `requestAnimationFrame` when the tab is hidden, so the
> game only ticks while its tab is visible. That's expected.

## How to extend

### Add a new threat
1. Add an entry to `CDL.ENEMY_TYPES` in `enemies.js` (stats, `shape`, `color`,
   `label`, and a defensive `tip` for the incident report).
2. If it needs a new silhouette, add a `case` to `drawEnemy()`'s `switch`.
3. Make it spawn by editing `allowedTypes(wave)` in `waves.js`.

### Add a new tool
1. Add its default state to `freshTools()` in `tools.js`.
2. Add its behaviour (cooldown + effect) to `CDL.Tools.update()`, and any
   visuals to the `draw*` helpers.
3. Add an **unlock** card and **upgrade** cards to `CDL.UPGRADES` in
   `upgrades.js` (use `available()` to gate them).
4. Optionally add a display name to `CDL.TOOL_META` so it can be credited in the
   incident report.

### Add an upgrade
Append an object to `CDL.UPGRADES` with `id`, `name`, `icon`, `kind`
(`unlock` | `upgrade` | `passive`), `desc`, `available(tools)`, and
`apply(player, tools)`.

### Tune difficulty
Edit `CDL.CONFIG` in `config.js`:
- `player.invuln` — i-frame length after a hit.
- `waves.healthScale` / `speedScale` / `speedCap` / `damageScale` — per-wave ramp.
- `waves.spawnBase` / `spawnStep` / `spawnMin` / `batchAfter` — spawn pacing.
- `waves.duration` — seconds per wave.
- `xp.base` / `xp.growth` — level-up pacing.

## Testing tips

Because everything is on `window.CDL`, you can poke at the game from the
browser console while it runs, e.g.:

```js
CDL.S.player.hp           // current health
CDL.S.wave                // current wave
CDL.S.stats               // per-run kill/damage tallies
CDL.buildChoices()        // sample a level-up draw
CDL.Waves.bannerText(7)   // check wave-intro text
```

This makes it easy to verify behaviour and balance without instrumenting the
code.
