# Changelog

All notable changes to **Cyber Defense Lab: Packet Survivor** are documented
here. The format is loosely based on [Keep a Changelog](https://keepachangelog.com/),
and the project aims to follow [Semantic Versioning](https://semver.org/).

## [0.6.0] - 2026-06-20 — SOC Hub & Progression Update

Reasons to come back: collection, unlocks, achievements, daily simulations, and a
home base — all persisted locally, still no backend / login / tracking.

### Added
- **Progression save system** — one `localStorage` object (`packetSurvivorSave`)
  with safe defaults + migration of the old best-score key (`save.js`).
- **SOC Hub** — a dashboard home base: total runs, best score/wave/level, lifetime
  telemetry, threats contained, tools unlocked, threats discovered, achievements,
  lab progress, and the last incident, with navigation to every meta screen.
- **Tool Library** — all 22 tools with locked/unlocked/used status, range, damage,
  cooldown, role, description, unlock condition, and threats contained per tool.
- **Threat Intel Database** — all 7 threats with discovered/locked status, danger,
  first-seen wave, times contained, damage caused, recommended defensive tools, and
  a short defensive explanation.
- **Persistent unlocks** — 15 tools unlock through play (wave / containment /
  telemetry milestones); 7 damage tools are unlocked by default. Locked tools never
  appear in the starting-tool choice or level-up pool until unlocked.
- **Achievements** — 14 milestones with progress bars, stored locally.
- **Daily Simulation** — a 7-day, day-of-week rotation (Inbox Triage, Patch Tuesday,
  Web Exposure Review, Identity Review, Exfiltration Watch, Backup Drill, Threat
  Hunt) with per-day modifiers, a pre-run briefing, and local completion tracking.
  No backend or date server.
- **Cyber Defense Lab Room** — 50 unlockable items across 5 categories (SOC Desk,
  Wall Board, Tool Cabinet, Threat Intel, Trophies) showing visible progression.
- **Incident Archive** — the last 10 run reports (date, mode, score, wave, level,
  threats, telemetry, top tool, worst threat).
- **Unlock notifications** — newly unlocked tools / achievements / lab items are
  listed on the game-over incident report.

### Changed
- Main menu reorganised: **Start Run · Daily Simulation · SOC Hub · How to Play ·
  Reset Progress**. Reset Progress wipes the save (with a confirmation prompt).
- Game over now folds the run into the persistent save (lifetime stats, discovery,
  unlocks, achievements, lab items, archive) before showing the report.

## [0.5.0] - 2026-06-20 — Loadout & Weapon Choice Update

A loadout-driven combat redesign: pick your opener, build toward 6 tools, and
see the numbers behind every choice. Tools are now a **data-driven ability
registry** (`abilities.js`) run by shared archetype engines (`tools.js`).

### Added
- **Choose Your First Tool** screen after Start: 3 random starter damage tools,
  each showing icon, range type, damage, cooldown/fire rate, and a description.
- **20+ damage abilities** (22 total) across 10 shared archetypes — pulse,
  radial, projectile, ring, orbit, beam, field, companion, **mine**, and
  **wall** (the last two are new mechanics).
- **6-slot active-tool cap** (`CONFIG.maxTools`). New-tool cards stop once the
  loadout is full.
- **Loadout HUD chip** — `Tools 3 / 6` plus tiny tool icons.
- **Numbers on cards** — tool cards show Damage / Range / Cooldown; upgrade cards
  show the change (e.g. `Damage: 12 → 17`, `Cooldown: 1.4s → 1.2s`).
- New passive: Backup Restore is now a passive (per-wave heal), alongside
  Hardened Core, Optimized Routing, and Telemetry Magnet.

### Changed
- **Level-up logic** — while under the cap each level-up offers exactly **1 new
  damage tool + 2 upgrades/passives**; at 6 tools it's upgrades/passives only.
  Upgrades are only ever offered for **owned** tools; passives are down-weighted
  so they don't dominate early.
- **Bigger arena** — internal resolution 1000×620 → **1200×720**, and the stage
  now fills `min(78vh, 800px)` for a roomier, less cramped play area.
- **Compact HUD** — single slimmer row, leaving more space for the arena.
- **Quieter event feed** — moved out of the combat area to a small strip under
  the HUD; only important messages (wave incoming/contained, tool acquired),
  fewer items, faster fade. Per-hit / per-kill spam removed.
- **Damage tuning** — most abilities hit a little harder; short-range tools do
  more, long-range less but safer, fields/traps lower but add control. Early
  enemy HP stays trimmed. Validated curve (Analyst dies ~wave 7): waves 1–3
  comfortable, 4–6 tense, 7+ dangerous. Training forgiving (~wave 11), Incident
  hardest (~wave 6). Not immortal.

### Notes
- Shared mechanics are intentional: several tools reuse one archetype engine but
  differ in stats, range, colour, and shape. See `docs/DEVELOPMENT_NOTES.md` for
  the per-archetype tool list.

## [0.4.0] - 2026-06-19 — Weapons & Balance Update

Six new defensive tools and a balance pass for a stronger, more varied feel.
Fully additive — existing tools and the core loop are unchanged.

### Added — new defensive tools (each with an unlock + 3 upgrade cards)
- **Packet Storm** 💠 — burst-fires defensive packets in all directions; great
  for clearing weak swarms. Upgrades: +damage, +packets, -cooldown.
- **Threat Hunter Drone** 🚁 — an orbiting companion that auto-shoots the nearest
  threat. Upgrades: +damage, +fire rate, +drone (up to 3).
- **Patch Wave** 🩹 — periodic expanding remediation ring around the player.
  Upgrades: +radius, +damage, -cooldown.
- **DLP Net** 🕸️ — a net field that slows and damages threats; extra-effective vs
  the Exfiltration Drone. Upgrades: +damage, +duration, +slow.
- **Log Shredder** 🌀 — an orbiting telemetry shard that shreds threats it touches.
  Upgrades: +damage, +orbit speed, +size.
- **Sandbox Trap** 🧪 — a containment zone that strongly slows and saps trapped
  threats. Upgrades: +radius, +duration, -cooldown.

### Changed — balance
- Existing tool base damage raised ~12–20% (Firewall, EDR, SIEM, MFA, Quarantine)
  so damage feels a little stronger.
- Early enemy tankiness trimmed (Malware/Phishing/Brute Force) for a more
  comfortable opening.
- Level-ups now mildly favour **NEW TOOL** cards in the early game for faster
  build variety.
- Difficulty presets unchanged: Training stays forgiving, Analyst balanced,
  Incident Commander hard. Validated curve (Analyst): waves 1–3 comfortable,
  4–6 tense, 7+ dangerous.

### Notes
- Shared rendering primitives extended (projectile `source`/`color`, pulse
  `color`, field `kind`/`dps`) — no new files; still classic scripts, no build.

## [0.3.0] - 2026-06-19 — Polish & Incident Report Update

Game-feel, clarity, and replayability pass. Fully additive — the MVP loop is unchanged.

### Added
- **Difficulty modes** — *Training*, *Analyst*, and *Incident Commander*, chosen
  on the main menu. Simple multipliers in `config.js` adjust threat HP, speed,
  contact damage, scaling rate, and spawn pace. The selected mode shows on the
  HUD and in the incident report.
- **Visual feedback (juice):** per-threat hit flash, particle burst on threat
  death, a pop when telemetry is collected, a red player-damage flash, and
  damage-scaled screen shake. New lightweight `src/js/effects.js` particle pool
  (hard-capped for performance).
- **Threat Intel** and **Defensive Tools** guides on the How to Play screen,
  generated from data — each threat shows behaviour, a danger rating, and a
  short cyber explanation; each tool shows its in-game behaviour and a defensive
  explanation.
- **Upgrade rarity** — cards now show a rarity badge (COMMON / UNCOMMON / RARE)
  alongside the type badge (NEW TOOL / UPGRADE / PASSIVE); the draw is lightly
  weighted by rarity.
- **Richer incident report** — adds Telemetry Collected, Difficulty, and a
  per-type *threats contained* breakdown; the recommendation is now keyed to the
  highest-risk threat (e.g. Ransomware → "Improve endpoint containment and backup
  recovery coverage.").
- Clearer **wave start** (animated banner) and **wave complete** ("Wave N
  contained") messaging.

### Changed
- Enemy silhouettes sharpened with consistent outlines and small identifying
  marks (ransomware padlock, credential key-bow, exfil motion trail, C2 beacon
  rings) for faster recognition.
- Two upgrades renamed for clarity: *Telemetry Magnet* and *Honeypot -Cooldown*.

## [0.2.0] - 2026-06-19

Polish & architecture release. No gameplay regressions — the MVP loop is intact.

### Added
- **Post-run incident report** on game over: threats contained, most effective
  defensive tool, highest-risk threat encountered, and an abstract defensive
  recommendation tied to that threat.
- **PASSIVE** as a third upgrade-card type (alongside New Tool and Upgrade);
  player buffs and Backup Restore are now clearly tagged.
- **Restart** button added to the pause overlay.
- Project documentation: `CHANGELOG.md`, `LICENSE`, and `docs/GAME_DESIGN.md`,
  `docs/ROADMAP.md`, `docs/DEVELOPMENT_NOTES.md`.
- `assets/screenshots/` and `assets/icons/` folders.

### Changed
- **Restructured the project** into `src/css/` and `src/js/`, splitting the
  single `game.js` into focused modules: `config`, `storage`, `enemies`,
  `tools`, `upgrades`, `waves`, `player`, `ui`, `game`. Still loaded as classic
  scripts (no build step, works on `file://` and GitHub Pages).
- **Better wave-intro banners** with threat-specific phrasing
  (e.g. *"WAVE 4 INCOMING — Ransomware activity detected"*).
- **Clearer upgrade card descriptions** with short defensive explanations.
- **Rebalanced difficulty**: enemy contact damage now scales per wave so the
  player can no longer become effectively immortal; post-hit invulnerability
  shortened to a fair 0.6s; Backup Restore healing tuned down so it helps
  without preventing death. Early waves remain easy; mid waves now bite.
- Centralised all tunable numbers in `src/js/config.js`.
- Expanded code comments explaining each system and where to add new threats,
  tools, and difficulty tuning.

### Fixed
- Event-feed throttle timestamps now reset on a new run (previously a fresh
  run could briefly suppress feed messages after a restart).

## [0.1.0] - 2026-06-19

Initial playable MVP.

### Added
- Top-down arena survival loop: WASD/arrow movement, edge-spawning threats that
  chase the player, and auto-firing defensive tools.
- Seven threat types and eight defensive tools.
- Telemetry pickups, XP/level-up system, and a 3-card upgrade chooser.
- Wave system with escalating difficulty.
- Game-over screen and best-score persistence via `localStorage`.
- Dark SOC-dashboard UI: main menu, How to Play, HUD, pause overlay.
