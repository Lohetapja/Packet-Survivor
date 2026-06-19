# Cyber Defense Lab Packet Survivor

A top-down arena **survival** game with a defensive cybersecurity theme. You play
a **Defender Packet** inside a compromised company network — survive waves of
abstract cyber threats, collect telemetry, and upgrade your defensive tools for as
long as you can hold the line.

Built with **plain HTML, CSS, and JavaScript**. No backend, no API, no login, no
database, no accounts, no tracking, **no build step**. It runs by simply opening
`index.html`, and deploys to **GitHub Pages** as-is.

> 🧠 **It's a game, not a quiz.** There are no questions, answers, or exam-style
> content. You absorb real defensive-security concepts — firewall, EDR, SIEM, DNS
> sinkhole, MFA, honeypot, quarantine, backups — through the names, descriptions,
> and behaviour of your tools and the threats you face.

## Live Demo

Play the game here:

https://lohetapja.github.io/Packet-Survivor/

## Screenshots

### Main Menu

![Main Menu](assets/screenshots/menu.jpg)

### Gameplay

![Gameplay](assets/screenshots/gameplay.jpg)

### Upgrade Selection

![Upgrade Selection](assets/screenshots/upgrades.jpg)

### How to Play

![How to Play](assets/screenshots/how-to-play.jpg)

## Features

- 🎮 Top-down arena survival with smooth WASD / arrow-key movement
- 🌊 Seven distinct threat types introduced one wave at a time
- 🧰 Eight defensive tools that **auto-activate** — detection, containment & recovery
- ⬆️ Level-up system with a 3-card upgrade chooser (New Tool / Upgrade / Passive)
- 📈 Difficulty scaling: easy early waves, genuinely stressful mid waves
- 🟢 Telemetry pickups with a magnet radius
- 🧾 Post-run **incident report** (most effective defense, highest-risk threat, recommendation)
- 💾 Best score saved to `localStorage` — fully offline
- 🎛️ Pause / Resume / Restart / Main Menu flow
- 🌑 Dark SOC-dashboard aesthetic, responsive layout

## Controls

| Action | Keys |
| ------ | ---- |
| Move   | `W` `A` `S` `D` or arrow keys |
| Pause / Resume | `Spacebar` (or the on-screen buttons) |

No mouse aiming required — all tools auto-target. Defeated threats drop
**telemetry**; collect it to level up and choose 1 of 3 upgrades. Every 24 seconds
a harder wave begins. At 0 health the network is breached and you get an incident
report.

## Defensive Tools

You start with the **Firewall Pulse**. The rest are unlocked and improved through
level-up upgrades.

| Tool | Type | What it does |
| ---- | ---- | ------------ |
| 🔥 Firewall Pulse | Active | Short-range pulse that damages and knocks back nearby threats |
| ✳️ EDR Burst | Active | Fires tracking bursts at nearby threats; extra-effective vs Malware & Ransomware |
| 📡 SIEM Scanner | Active | A scanning ring that damages nearby threats and grants bonus telemetry |
| 🕳️ DNS Sinkhole Field | Active | Drops a field that slows threats caught inside it |
| 🛡️ MFA Shield | Active | Rotating shield nodes that block and damage threats that touch you |
| 🍯 Honeypot Decoy | Active | Deploys a lure that distracts threats away from you |
| 🎯 Quarantine Beam | Active | Beams the closest threat with steady damage over time |
| 💾 Backup Restore | Passive | Restores some health after each wave you survive |

## Threat Types

| Threat | Behaviour |
| ------ | --------- |
| 🟠 Malware Blob | Basic; medium speed and health |
| 🔺 Phishing Hook | Fast, fragile; rushes you |
| 🔻 Brute Force Swarm | Weak, but spawns in groups |
| 🟥 Ransomware Cube | Slow, high health, high damage |
| ⬟ Credential Thief | Fast; weaves as it closes in |
| 🟡 Beacon Signal | Small command-and-control activity; appears later |
| ➤ Exfiltration Drone | Fast late-game threat; worth bonus score |

## Run Locally

No server, no install, no build:

1. Download or clone the repository.
2. Double-click **`index.html`** (or open it in any modern browser).

If your browser blocks local scripts, you can optionally serve the folder with any
static server, e.g. `python -m http.server 8000`, then open `http://localhost:8000`.

## Deploy on GitHub Pages

1. Push the files to a GitHub repository.
2. In the repo, go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to *Deploy from a branch*, choose
   your branch (e.g. `main`) and the **`/ (root)`** folder.
4. Save. The game goes live at `https://<your-username>.github.io/<your-repo>/`.

No build, bundler, or CI is required — the files are served exactly as they are.

## Tech Details

- **Stack:** vanilla HTML5 Canvas + CSS + JavaScript. No frameworks.
- **No build step:** classic `<script>` tags loaded in dependency order onto a
  single `window.CDL` namespace. This deliberately avoids ES-module `import` (which
  fails under the `file://` protocol), so the game runs both by double-clicking
  `index.html` and on GitHub Pages.
- **Rendering:** one `<canvas>` at a fixed 1000×620 internal resolution, scaled
  responsively with CSS, driven by a single `requestAnimationFrame` loop.
- **Persistence:** a single integer in `localStorage` (`cdl_packet_survivor_best`).
  Nothing else is stored or transmitted.

## Project Structure

```
.
├── index.html                 # markup: menus, HUD, overlays, game-over screen
├── README.md
├── CHANGELOG.md
├── LICENSE
├── src/
│   ├── css/style.css          # dark SOC-dashboard theme
│   └── js/                     # config, storage, enemies, tools, upgrades,
│                               #   waves, player, ui, game (loaded in order)
├── assets/
│   ├── screenshots/           # README screenshots
│   └── icons/                 # optional custom icons (game uses emoji by default)
└── docs/
    ├── GAME_DESIGN.md         # design pillars, mechanics, balance
    ├── ROADMAP.md             # planned / possible future work
    └── DEVELOPMENT_NOTES.md   # architecture & "how to extend" notes
```

## Learning Purpose

This is a **portfolio + educational** project for a Cyber Defense Lab. The goal is
to make core *defensive* security concepts memorable through play: defense in depth,
detection & response (EDR/SIEM), containment & recovery (quarantine, sinkholes,
backups), and identity (MFA). The post-run incident report reinforces a real
defender habit — review what happened, identify the biggest risk, note an improvement.

## Disclaimer

This is an **abstract, defensive, educational** game. It contains **no real malware,
no exploit code, no phishing templates, no credential-theft steps, no hacking
commands, and no attack instructions of any kind.** All "threats" are stylised
geometric shapes and all "tools" are conceptual representations of defensive security
practices. Nothing here can be used to attack a real system.

## License

Released under the [MIT License](LICENSE).
