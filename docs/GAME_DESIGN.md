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

## Tools & loadout (v0.5.0)

Tools are a **data-driven ability registry** (`abilities.js`): 22 damage
abilities, each declaring an **archetype** (shared behaviour) plus tuned stats
and a short list of upgrades. A handful of shared archetype engines (`tools.js`)
run whatever the player owns, so 20+ tools ship without 20 bespoke code paths.

Archetypes and their tools:

| Archetype | Range | Tools |
| --------- | ----- | ----- |
| pulse | area | Firewall Pulse, Patch Wave, NDR Sweep |
| radial | mid | Packet Storm, SOAR Volley |
| projectile | mid/long | EDR Burst, IDS Needle, YARA Strike, Telemetry Lance |
| ring | close/area | SIEM Scanner, Zero Trust Ring |
| orbit | close | MFA Shield, Log Shredder, TLS Shield Arc |
| beam | long | Quarantine Beam, Memory Scanner |
| field | trap | DNS Sinkhole, DLP Net, Sandbox Trap |
| companion | companion | Threat Hunter Drone |
| mine | trap | Containment Mine |
| wall | area | Network Segmentation Wall |

**Loadout rules:** the player picks one **starting tool** from three at run start,
then builds toward a cap of **6 active tools** (`CONFIG.maxTools`). Passives
(Hardened Core, Optimized Routing, Telemetry Magnet, Backup Restore) sit outside
the cap. Balance by range: short-range hits harder, long-range is safer but
weaker, fields/traps trade damage for control.

## Progression & upgrades

- **Telemetry → XP.** Pickups dropped by defeated threats fill the level bar.
  XP to next level grows geometrically (`base 10 × 1.22^(level-1)`).
- **Level-up chooser (3 cards).** While the loadout has free slots, exactly **one
  card is a new damage tool** and the rest are **upgrades for owned tools** or
  passives. Once 6 tools are owned, all cards are upgrades/passives. Cards are
  tagged by **type** (New Tool / Upgrade / Passive) and **rarity** (Common /
  Uncommon / Rare), and show the numbers behind the choice (e.g. `Damage: 12 →
  17`). Upgrades are never shown for tools you don't own; passives are
  down-weighted so they don't dominate early.

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

*v0.4.0 tuning:* existing tool damage was raised ~12–20% and early enemy HP
trimmed so the player feels a little stronger and the opening is comfortable —
without changing the death curve (Analyst still falls around wave 7). The larger
tool roster spreads upgrades thinner per run, which keeps power in check while
adding variety. Level-ups mildly favour NEW TOOL cards early so builds diverge
quickly.

## Difficulty modes

Chosen on the menu, layered on top of the per-wave scaling above as simple
multipliers (`src/js/config.js → difficulties`):

| Mode | Threat HP | Speed | Damage | Ramp | Spawn pace |
| ---- | --------- | ----- | ------ | ---- | ---------- |
| **Training** | ×0.80 | ×0.90 | ×0.70 | slower (×0.65) | slower |
| **Analyst** (default) | ×1.00 | ×1.00 | ×1.00 | normal | normal |
| **Incident Commander** | ×1.25 | ×1.10 | ×1.30 | faster (×1.35) | faster |

The selected mode shows on the HUD and in the post-run incident report.

## Incident report

When the run ends, an abstract SOC-style "incident report" recaps it: final
score, wave/level reached, threats contained, telemetry collected, difficulty,
the most effective defensive tool, the highest-risk threat, a per-type breakdown
of threats contained, and a defensive recommendation keyed to whichever threat
dealt the most damage (e.g. Ransomware → "Improve endpoint containment and backup
recovery coverage."). This mirrors a real defender habit: review, find the
biggest risk, note an improvement.

## Tone & art direction

- Dark navy SOC dashboard; cyan = player/defense, warm red/orange = threats,
  green = telemetry.
- Original geometric shapes only — no third-party or copyrighted assets, and no
  resemblance to any specific commercial game's characters, names, or art.
- **Game feel is kept subtle:** hit flashes, small death bursts, telemetry pops,
  a brief red damage vignette, and light screen shake — readable, never noisy.
  Each threat also has a distinct silhouette + a small identifying mark for
  fast recognition.

## Content safety

Strictly abstract and defensive. No real malware, exploit code, phishing
templates, credential-theft steps, hacking commands, real targets, or offensive
tutorials anywhere in the game or its text.
