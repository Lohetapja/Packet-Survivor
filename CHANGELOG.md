# Changelog

All notable changes to **Cyber Defense Lab: Packet Survivor** are documented
here. The format is loosely based on [Keep a Changelog](https://keepachangelog.com/),
and the project aims to follow [Semantic Versioning](https://semver.org/).

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
