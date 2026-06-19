# Roadmap

Possible future work, roughly in priority order. Everything here must keep the
project **static, dependency-free, and GitHub-Pages-friendly** — no backend,
API, database, accounts, or tracking.

## Near term (small, safe additions)

- [ ] **Screenshots** committed to `assets/screenshots/` and wired into the README.
- [ ] **Sound & music** — short Web Audio blips for hits/level-ups/game-over,
      with a mute toggle (respect autoplay rules; default off until first input).
- [ ] **Floating combat text** — small "+telemetry" / damage popups.
- [ ] **Settings panel** — toggle screen shake, reduce-motion mode, mute.
- [ ] **Difficulty modes** — Analyst (easier), Responder (default),
      Hardened (faster scaling).

## Mid term (gameplay depth)

- [ ] **2–3 more defensive tools** (e.g. "Patch Deployment" area cleanse,
      "Network Segmentation" walls, "Threat Intel Feed" auto-reveal).
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
