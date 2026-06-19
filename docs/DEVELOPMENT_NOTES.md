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
config → storage → effects → enemies → tools → upgrades → waves → player → ui → game
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
| `config.js` | namespace, `CONFIG` tunables (incl. `difficulties`), `CDL.S` state, `CDL.diff()`, math helpers, `freshStats()` |
| `storage.js` | `localStorage` best-score load/save (fails soft) |
| `effects.js` | `CDL.Effects` — cosmetic particle pool (death bursts, telemetry pops), capped |
| `enemies.js` | `ENEMY_TYPES` (+ intel/`reco` data), `THREAT_ORDER`, `damageEnemy()` (kill/type tally, hit-flash, death burst), AI, rendering, `nearest()` |
| `tools.js` | `freshTools()`, tool auto-activation, projectiles, tool rendering, `TOOL_META`, `TOOL_INFO`/`TOOL_ORDER` (guide data) |
| `upgrades.js` | `UPGRADES` pool (type + `rarity`), tag/rarity metadata, rarity-weighted `buildChoices()` |
| `waves.js` | difficulty-aware scaling multipliers, `allowedTypes()`, spawning, `nextWave()`, banner text |
| `player.js` | `create()`, movement, `gainXp()` (telemetry tally), `hit()` (damage flash), pickups, rendering |
| `ui.js` | **all** DOM: HUD (+difficulty), feed, banners, damage flash, difficulty selector, upgrade cards, incident report, Threat Intel & Tools guides |
| `game.js` | input, state machine, main loop, run setup, level-up flow, incident report build, button wiring |

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
   `label`, plus the info fields `behavior`, `danger`, `tip`, and `reco`).
2. Add the key to `CDL.THREAT_ORDER` so it shows in the Threat Intel guide and
   the incident-report breakdown.
3. If it needs a new silhouette, add a `case` to `drawEnemy()`'s `switch`.
4. Make it spawn by editing `allowedTypes(wave)` in `waves.js`.

### Add a new tool
1. Add its default state to `freshTools()` in `tools.js`.
2. Add its behaviour (cooldown + effect) to `CDL.Tools.update()`, and any
   visuals to the `draw*` helpers.
3. Add an **unlock** card and **upgrade** cards to `CDL.UPGRADES` in
   `upgrades.js` (use `available()` to gate them).
4. Add a display name to `CDL.TOOL_META` (incident-report credit) and an entry
   to `CDL.TOOL_INFO` + `CDL.TOOL_ORDER` (the Defensive Tools guide).

Reusable primitives (so a new tool rarely needs new render code):
- **Projectiles** — push to `S.projectiles` with `{ x, y, vx, vy, dmg, r, life,
  source, color, bonus? }`. `source` drives kill credit; `color` tints it;
  `bonus` applies the anti-Malware/Ransomware multiplier.
- **Pulses** — push to `S.pulses` with `{ x, y, r:0, maxR, life, maxLife,
  color? }` (`color` is an `"r,g,b"` string) for an expanding ring.
- **Fields** — push to `S.fields` with `{ x, y, r, slow, life, maxLife, kind,
  dps? }`. `slow` multiplies enemy speed inside; `dps` deals damage-over-time
  (handled in `enemies.js`); `kind` (`dns`/`dlp`/`sandbox`) selects the visual.
- Continuous damage sources (beams/fields) should be listed in
  `CONTINUOUS_SRC` (enemies.js) so they skip the per-hit flash.

### Add an upgrade
Append an object to `CDL.UPGRADES` with `id`, `name`, `icon`, `kind`
(`unlock` | `upgrade` | `passive`), `rarity` (`common` | `uncommon` | `rare`),
`desc`, `available(tools)`, and `apply(player, tools)`.

### Tune difficulty
Edit `CDL.CONFIG` in `config.js`:
- `difficulties` — the Training / Analyst / Incident Commander presets
  (`hp`, `speed`, `damage`, `scale`, `spawn` multipliers).
- `player.invuln` — i-frame length after a hit.
- `waves.healthScale` / `speedScale` / `speedCap` / `damageScale` — per-wave ramp.
- `waves.spawnBase` / `spawnStep` / `spawnMin` / `batchAfter` — spawn pacing.
- `waves.duration` — seconds per wave.
- `xp.base` / `xp.growth` — level-up pacing.

### Add visual feedback
Use `CDL.Effects.death(x, y, color)` / `CDL.Effects.pickup(x, y)` for particles,
set `e.hitFlash` on a threat for a flash, or `CDL.UI.flashDamage()` for the
player vignette. Keep it cheap — the particle pool is capped in `effects.js`.

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
