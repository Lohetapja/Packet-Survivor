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
config → storage → effects → abilities → enemies → tools → upgrades → waves → player → ui → game
```

`config.js` must be first (it creates `window.CDL`, `CDL.CONFIG`, and `CDL.S`).
`abilities.js` must load before `enemies.js` (which reads `CDL.CONTINUOUS_SRC`
at load time) and before the tool engine. `game.js` must be last (it boots
everything and starts the loop).

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
| `abilities.js` | **data registry**: `CDL.ABILITIES` (22 damage tools + archetype + stats + upgrade specs), `PASSIVES`, derived `TOOL_META/ORDER/INFO`, `CONTINUOUS_SRC`, loadout helpers (`createToolState`, `grantTool`, `starterChoices`, `toolCardData`) |
| `enemies.js` | `ENEMY_TYPES` (+ intel/`reco`), `THREAT_ORDER`, `damageEnemy()` (kill/type tally, hit-flash, death burst), AI, field/wall DoT, rendering, `nearest()` |
| `tools.js` | the **engine**: per-archetype handlers, projectile/mine/wall sim, and all tool rendering (runs whatever `player.toolOrder` owns) |
| `upgrades.js` | loadout-aware `buildChoices()` (new-tool + owned-tool upgrade + passive cards), card builders, stat formatting, tag/rarity metadata |
| `waves.js` | difficulty-aware scaling multipliers, `allowedTypes()`, spawning, `nextWave()` (Backup Restore heal), banner text |
| `player.js` | `create()` (empty loadout: `tools{}`, `toolOrder[]`, `backupHeal`), movement, `gainXp()`, `hit()` (damage flash), pickups, rendering |
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

### Add a new damage ability (the common case)
Append one object to `CDL.ABILITIES` in `abilities.js` — **no engine code needed**
if it fits an existing archetype:
```js
{ id, name, icon, range: "Close|Mid|Long|Area|Companion|Trap",
  archetype: "pulse|radial|projectile|ring|orbit|beam|field|companion|mine|wall",
  color, desc, explain, starter: true?,
  base: { ...archetype stats }, ups: [ add("damage", 5, "+Damage", "common"), ... ] }
```
`TOOL_META/ORDER/INFO`, `CONTINUOUS_SRC`, the guide, the start-tool pool, and the
incident report all derive from this automatically. `color` is a hex for
projectile/orbit/companion tools and an `"r,g,b"` string for pulse/ring/beam/wall;
field tools use a `kind` string (`dns`/`dlp`/`sandbox`) for the visual.

### Add a new archetype (rare)
Only if no existing behaviour fits: add a handler to `ARCH` in `tools.js`
(receives `(st, def, dt)`), render it from the right `draw*` layer, and — if it
deals continuous damage — make sure its tools land in `CONTINUOUS_SRC`.

Reusable effect arrays (most archetypes only push to these):
- `S.projectiles` — `{ x, y, vx, vy, dmg, r, life, source, color, bonus, pierce, hits }`.
- `S.pulses` — `{ x, y, r:0, maxR, life, maxLife, color }` (`"r,g,b"`).
- `S.fields` — `{ x, y, r, slow, dps, life, maxLife, kind, src, bonusType? }`.
- `S.mines` — `{ x, y, trigger, blastR, dmg, src, color }`.
- `S.walls` — `{ x1, y1, x2, y2, dps, slow, src, color, life, maxLife }`.

### Add a passive
Append to `CDL.PASSIVES` in `abilities.js`: `{ id, name, icon, rarity, desc,
preview(player), apply(player) }`. Passives never count toward the 6-tool cap.

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
