# Game Design — Cyber Defense Lab: Packet Survivor

## Concept

A top-down arena survival game framed as a Security Operations Center (SOC)
scenario. The player is a **Defender Packet**: a defensive security process
inside a compromised company network. Abstract cyber threats spread through the
system; the player survives waves, collects **telemetry**, and upgrades
**defensive tools** to hold out as long as possible.

The cybersecurity theme is *flavour and education*, never a quiz. Players learn
by association — tool names, threat behaviours, and the end-of-run incident
report all map to real defensive concepts.

## Design pillars

1. **Positioning over aiming.** Tools auto-activate. Skill expression is
   movement: dodging, kiting, and using terrain (fields, decoys) wisely.
2. **Readable at a glance.** Distinct shapes/colours per threat, clear HUD,
   a SOC-dashboard look. No clutter, no flashy noise.
3. **Defensive framing throughout.** Every mechanic is detection, containment,
   or recovery — never offense. Safe for a portfolio and for classrooms.
4. **Easy to pick up, hard to master.** Gentle early waves teach the loop;
   later waves demand good tool synergy and movement.
5. **Static & simple.** No backend, no build step, no dependencies.

## Core loop

```
move → dodge threats → tools auto-defeat threats → collect telemetry
   → fill telemetry bar → level up → pick 1 of 3 upgrades → repeat
   (every 24s a harder wave begins; 0 HP ends the run → incident report)
```

## Player

- **Defender Packet** — a glowing blue core. Stats: Health, Level,
  Telemetry/XP, Score, Wave, Best Score.
- Brief invulnerability after each hit (0.6s) so a single cluster can't instantly
  kill, but it's short enough that careless play is punished.

## Threats

Introduced one new type per wave so the player learns each in isolation:

| Wave | New threat | Character |
| ---- | ---------- | --------- |
| 1 | Malware Blob | baseline |
| 2 | Phishing Hook | fast, fragile rusher |
| 3 | Brute Force Swarm | weak, arrives in clusters |
| 4 | Ransomware Cube | slow tank, heavy hit |
| 5 | Credential Thief | fast, weaving |
| 6 | Beacon Signal | small, late C2 activity |
| 7 | Exfiltration Drone | fast, high score value |
| 8+ | Mixed | everything, scaling up |

## Tools (defensive)

Start with **Firewall Pulse**; unlock the rest via upgrades. Each maps to a real
defensive control: EDR (endpoint detection & response), SIEM (security
analytics), DNS sinkhole, MFA, honeypot, quarantine/isolation, and backups.
Tools are split between **active** (auto-firing effects) and **passive**
(Backup Restore). See the README table for behaviours.

## Progression & upgrades

- **Telemetry → XP.** Pickups dropped by defeated threats fill the level bar.
  XP to next level grows geometrically (`base 10 × 1.22^(level-1)`).
- **Level-up chooser.** Three random valid cards, each tagged:
  - **New Tool** — unlock a tool you don't own yet.
  - **Upgrade** — improve an owned tool.
  - **Passive** — always-on stat boost or safety net.
- A card is only offered when it makes sense (e.g. a tool's upgrades appear only
  after it's unlocked).

## Difficulty & balance

Every new wave nudges four levers (all in `src/js/config.js → waves`):

| Lever | Effect |
| ----- | ------ |
| `healthScale` | enemies get tankier (+14%/wave) |
| `speedScale` / `speedCap` | enemies get faster, capped below player speed |
| `damageScale` | **contact damage rises (+4.5%/wave)** — the key anti-immortality lever |
| `spawnBase`/`spawnStep`/`batchAfter` | spawns get more frequent and arrive in bigger batches |

**Intended curve** (validated by simulation with an optimal evasion bot):

| Waves | Feel |
| ----- | ---- |
| 1–3 | easy — learn the loop, rarely threatened |
| 4–5 | rising — tool choices start to matter |
| 6–7 | stressful — HP swings hard, mistakes are costly |
| 8+ | attrition — eventually overwhelming |

**Backup Restore** heals a modest flat amount per wave: a meaningful safety net
that buys time but cannot outpace late-wave damage, so death stays inevitable.

## Tone & art direction

- Dark navy SOC dashboard; cyan = player/defense, warm red/orange = threats,
  green = telemetry.
- Original geometric shapes only — no third-party or copyrighted assets, and no
  resemblance to any specific commercial game's characters, names, or art.

## Content safety

Strictly abstract and defensive. No real malware, exploit code, phishing
templates, credential-theft steps, hacking commands, real targets, or offensive
tutorials anywhere in the game or its text.
