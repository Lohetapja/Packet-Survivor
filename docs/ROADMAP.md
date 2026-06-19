# Roadmap

Possible future work, roughly in priority order. Everything here must keep the
project **static, dependency-free, and GitHub-Pages-friendly** — no backend,
API, database, accounts, or tracking.

## Recently shipped

- [x] **Screenshots** committed to `assets/screenshots/` and wired into the README.
- [x] **Difficulty modes** — Training / Analyst / Incident Commander (v0.3.0).
- [x] **Visual feedback** — hit flashes, death bursts, telemetry pops, damage
      flash, screen shake (v0.3.0).
- [x] **Threat Intel & Defensive Tools** in-game guides (v0.3.0).
- [x] **Upgrade rarity** badges + richer incident report with per-type breakdown (v0.3.0).
- [x] **Six new defensive tools** (Packet Storm, Threat Hunter Drone, Patch Wave,
      DLP Net, Log Shredder, Sandbox Trap) + balance pass — 14 tools total (v0.4.0).

## Near term (small, safe additions)

- [ ] **Sound & music** — short Web Audio blips for hits/level-ups/game-over,
      with a mute toggle (respect autoplay rules; default off until first input).
- [ ] **Floating combat text** — small "+telemetry" / damage popups.
- [ ] **Settings panel** — toggle screen shake, reduce-motion mode, mute.
- [ ] **Per-difficulty best scores** — track a separate best for each mode.

## Mid term (gameplay depth)

- [ ] **A few more tools** from the original wishlist (Credential Lockout
      control burst, Memory Scanner beam) to round out the roster.
- [ ] **Synergy upgrades** — cards that combine two owned tools.
- [ ] **More threats** + a periodic **"Intrusion" mini-boss** every few waves.
- [ ] **Tool cooldown/loadout HUD** showing owned tools and levels.
- [ ] **Run summary history** — last N incident reports kept in `localStorage`.

## Long term (polish & reach)

- [ ] **Accessibility pass** — colourblind-safe palette option, full keyboard
      navigation of menus, ARIA labels.
- [ ] **Mobile/touch controls** — virtual joystick for phones/tablets.
- [ ] **Light theming** — alternate palettes selectable from the menu.
- [ ] **Localisation** — externalise UI strings.

## Explicitly out of scope

To stay aligned with the project's constraints, these will **not** be added:

- Multiplayer or networking
- Any backend, API, database, login, or user accounts
- Analytics / telemetry that leaves the browser
- External paid services or heavyweight frameworks (React, Vite, bundlers)
- Anything offensive: real malware, exploits, phishing kits, or attack tutorials
