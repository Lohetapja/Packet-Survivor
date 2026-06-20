/* ============================================================
   abilities.js — the damage-ability registry (data) + passives
   ------------------------------------------------------------
   v0.5.0 Loadout update. Every damage tool is DATA here; the
   generic engine that runs them lives in tools.js. Each ability
   declares an `archetype` (shared behaviour) + tuned `base` stats
   + a short list of upgrade specs. This is what lets the game
   ship 20+ tools without 20 bespoke code paths.

   ARCHETYPES (shared mechanics — see tools.js for each engine):
     pulse      expanding ring AoE around the player (± knockback)
     radial     burst of projectiles (full circle, or aimed cone)
     projectile homing-straight shots at nearest target(s)
     ring       persistent damaging ring at a fixed radius
     orbit      orbiting node(s) that damage on contact
     beam       locks a target (nearest / highest-HP) for steady DoT
     field      dropped zone that slows + damages over time
     companion  orbiting drone that auto-fires at the nearest threat
     mine       dropped charge that detonates when a threat nears
     wall       temporary line segment that slows + damages crossers

   ★ TO ADD AN ABILITY: append a def below. Pick an archetype, set
     `base` stats, list 2–3 upgrade specs, mark `starter:true` if it
     makes a fair opener. Everything else (cards, guide, incident
     report, rendering) is derived automatically.
   ============================================================ */

(function (CDL) {
  "use strict";

  // Upgrade-spec helpers (compact). `cap(st)` optionally hides the
  // upgrade once a stat is maxed.
  const add = (stat, n, label, rarity, cap) => ({ stat, add: n, label, rarity: rarity || "common", cap });
  const mul = (stat, f, label, rarity, cap) => ({ stat, mul: f, label, rarity: rarity || "uncommon", cap });

  CDL.ABILITIES = [
    /* ---------- pulse ---------- */
    { id: "firewall", name: "Firewall Pulse", icon: "🔥", range: "Close", archetype: "pulse",
      color: "56,189,248", starter: true,
      desc: "Short-range pulse that damages and knocks threats back.",
      explain: "Filters and blocks hostile traffic at the perimeter.",
      base: { damage: 18, interval: 0.8, radius: 100, knockback: 220 },
      ups: [add("damage", 6, "+Damage", "common"), mul("interval", 0.85, "-Cooldown", "uncommon"), add("radius", 20, "+Range", "common")] },
    { id: "patchwave", name: "Patch Wave", icon: "🩹", range: "Area", archetype: "pulse",
      color: "45,212,191", starter: true,
      desc: "Expanding remediation wave around the player.",
      explain: "Rolling patches remediate weaknesses across range.",
      base: { damage: 16, interval: 2.2, radius: 130, knockback: 0 },
      ups: [add("damage", 7, "+Damage", "common"), add("radius", 28, "+Radius", "common"), mul("interval", 0.85, "-Cooldown", "uncommon")] },
    { id: "ndrsweep", name: "NDR Sweep", icon: "〰️", range: "Area", archetype: "pulse",
      color: "129,140,248",
      desc: "Wide network sweep that damages everything around you.",
      explain: "Network detection & response sweeps for hostile flows.",
      base: { damage: 20, interval: 2.6, radius: 170, knockback: 0 },
      ups: [add("damage", 8, "+Damage", "common"), add("radius", 30, "+Radius", "common"), mul("interval", 0.85, "-Cooldown", "uncommon")] },

    /* ---------- radial ---------- */
    { id: "packetstorm", name: "Packet Storm", icon: "💠", range: "Mid", archetype: "radial",
      color: "#67e8f9", starter: true,
      desc: "Burst-fires packets in all directions. Good vs swarms.",
      explain: "Saturates the segment to clear weak, swarming traffic.",
      base: { damage: 10, interval: 1.3, count: 7, pspeed: 320, life: 0.9, spread: 0, aimed: false },
      ups: [add("damage", 5, "+Damage", "common"), add("count", 2, "+Packets", "uncommon", (st) => st.count < 16), mul("interval", 0.85, "-Cooldown", "uncommon")] },
    { id: "soar", name: "SOAR Volley", icon: "🛰️", range: "Mid", archetype: "radial",
      color: "#a5b4fc",
      desc: "Automated multi-shot volley aimed at the nearest threat.",
      explain: "Security orchestration fires a coordinated response.",
      base: { damage: 12, interval: 1.2, count: 5, pspeed: 420, life: 1.0, spread: 0.8, aimed: true },
      ups: [add("damage", 6, "+Damage", "common"), add("count", 1, "+Shots", "uncommon", (st) => st.count < 10), mul("interval", 0.85, "-Cooldown", "uncommon")] },

    /* ---------- projectile ---------- */
    { id: "edr", name: "EDR Burst", icon: "✳️", range: "Mid", archetype: "projectile",
      color: "#7dd3fc", starter: true,
      desc: "Tracking shots at nearby threats. Extra vs Malware & Ransomware.",
      explain: "Endpoint Detection & Response finds and removes threats.",
      base: { damage: 16, interval: 0.7, count: 1, pspeed: 480, range: 360, pierce: 0, bonus: true, sameTarget: false },
      ups: [add("damage", 6, "+Damage", "common"), add("count", 1, "+Projectiles", "uncommon", (st) => st.count < 6), mul("interval", 0.82, "+Fire Rate", "uncommon")] },
    { id: "idsneedle", name: "IDS Needle", icon: "📍", range: "Long", archetype: "projectile",
      color: "#bae6fd",
      desc: "Fast single-target shots with a short cooldown.",
      explain: "Intrusion detection pins a suspicious signature fast.",
      base: { damage: 11, interval: 0.34, count: 1, pspeed: 600, range: 460, pierce: 0, bonus: false, sameTarget: false },
      ups: [add("damage", 4, "+Damage", "common"), mul("interval", 0.85, "+Fire Rate", "uncommon"), add("count", 1, "+Projectiles", "uncommon", (st) => st.count < 4)] },
    { id: "yara", name: "YARA Strike", icon: "🔬", range: "Mid", archetype: "projectile",
      color: "#5eead4",
      desc: "Fires a burst of shots at a single matched threat.",
      explain: "Signature rules match a process, then strike it.",
      base: { damage: 13, interval: 1.4, count: 3, pspeed: 460, range: 340, pierce: 0, bonus: false, sameTarget: true },
      ups: [add("damage", 6, "+Damage", "common"), add("count", 1, "+Shots", "uncommon", (st) => st.count < 7), mul("interval", 0.85, "-Cooldown", "uncommon")] },
    { id: "lance", name: "Telemetry Lance", icon: "🗡️", range: "Long", archetype: "projectile",
      color: "#34d399",
      desc: "Piercing line shot that passes through threats.",
      explain: "Correlated telemetry skewers a whole attack path.",
      base: { damage: 15, interval: 1.0, count: 1, pspeed: 520, range: 480, pierce: 3, bonus: false, sameTarget: false },
      ups: [add("damage", 6, "+Damage", "common"), add("pierce", 1, "+Pierce", "uncommon", (st) => st.pierce < 8), mul("interval", 0.85, "-Cooldown", "uncommon")] },

    /* ---------- ring ---------- */
    { id: "siem", name: "SIEM Scanner", icon: "📡", range: "Area", archetype: "ring",
      color: "34,211,238", starter: true,
      desc: "Scan ring damages nearby threats and grants bonus telemetry.",
      explain: "Security analytics correlate logs to surface activity.",
      base: { damage: 12, interval: 1.2, radius: 128, telemetry: true },
      ups: [add("damage", 5, "+Damage", "common"), add("radius", 24, "+Radius", "common"), mul("interval", 0.85, "-Cooldown", "uncommon")] },
    { id: "ztring", name: "Zero Trust Ring", icon: "⭕", range: "Close", archetype: "ring",
      color: "56,189,248",
      desc: "A tight ring that hits hard at close range.",
      explain: "Zero-trust checks every request close to the core.",
      base: { damage: 16, interval: 0.9, radius: 80, telemetry: false },
      ups: [add("damage", 6, "+Damage", "common"), add("radius", 16, "+Radius", "common"), mul("interval", 0.85, "-Cooldown", "uncommon")] },

    /* ---------- orbit ---------- */
    { id: "mfa", name: "MFA Shield", icon: "🛡️", range: "Close", archetype: "orbit",
      color: "#a5f3fc", starter: true, shape: "dot",
      desc: "Rotating shields block and damage threats that touch you.",
      explain: "Multi-factor auth stops stolen credentials being enough.",
      base: { damage: 16, count: 2, radius: 60, size: 9, rotSpeed: 2.6 },
      ups: [add("damage", 6, "+Damage", "common"), add("count", 1, "+Node", "uncommon", (st) => st.count < 6), mul("rotSpeed", 1.25, "+Orbit Speed", "uncommon")] },
    { id: "shredder", name: "Log Shredder", icon: "🌀", range: "Close", archetype: "orbit",
      color: "#5eead4", shape: "shard",
      desc: "An orbiting telemetry shard shreds threats it touches.",
      explain: "Turns collected logs into an active defensive barrier.",
      base: { damage: 14, count: 1, radius: 72, size: 14, rotSpeed: 3.0 },
      ups: [add("damage", 6, "+Damage", "common"), add("size", 5, "+Size", "uncommon"), mul("rotSpeed", 1.25, "+Orbit Speed", "uncommon")] },
    { id: "tlsarc", name: "TLS Shield Arc", icon: "🔰", range: "Close", archetype: "orbit",
      color: "#93c5fd", shape: "arc",
      desc: "An arc-shaped shield that damages on contact.",
      explain: "Encrypted transport shields traffic as it passes.",
      base: { damage: 15, count: 1, radius: 66, size: 16, rotSpeed: 2.2 },
      ups: [add("damage", 6, "+Damage", "common"), add("count", 1, "+Arc", "uncommon", (st) => st.count < 4), mul("rotSpeed", 1.25, "+Orbit Speed", "uncommon")] },

    /* ---------- beam ---------- */
    { id: "quarantine", name: "Quarantine Beam", icon: "🎯", range: "Long", archetype: "beam",
      color: "56,189,248", mode: "nearest",
      desc: "Locks the closest threat with steady damage over time.",
      explain: "Isolates a compromised element so it can't spread.",
      base: { dps: 34, range: 280 },
      ups: [add("dps", 12, "+Damage", "common"), add("range", 50, "+Range", "uncommon"), add("dps", 10, "+Beam Power", "uncommon")] },
    { id: "memscan", name: "Memory Scanner", icon: "🧠", range: "Long", archetype: "beam",
      color: "168,85,247", mode: "highhp",
      desc: "Scans the highest-HP threat for steady damage.",
      explain: "Live memory scanning roots out the toughest implant.",
      base: { dps: 30, range: 320 },
      ups: [add("dps", 12, "+Damage", "common"), add("range", 50, "+Range", "uncommon"), add("dps", 10, "+Scan Power", "uncommon")] },

    /* ---------- field ---------- */
    { id: "dns", name: "DNS Sinkhole Field", icon: "🕳️", range: "Trap", archetype: "field",
      color: "dns",
      desc: "Drops a zone that slows and damages threats inside it.",
      explain: "Redirects malicious domain lookups into a sinkhole.",
      base: { interval: 4.0, duration: 3.2, radius: 95, slow: 0.5, dps: 8 },
      ups: [add("dps", 5, "+Damage", "common"), add("duration", 1.5, "+Duration", "uncommon"), mul("slow", 0.85, "+Slow", "uncommon")] },
    { id: "dlp", name: "DLP Net", icon: "🕸️", range: "Trap", archetype: "field",
      color: "dlp", bonusType: "exfil",
      desc: "Net that slows + damages threats. Extra vs Exfiltration.",
      explain: "Data-loss prevention catches data on its way out.",
      base: { interval: 5.0, duration: 3.5, radius: 90, slow: 0.5, dps: 12 },
      ups: [add("dps", 6, "+Damage", "common"), add("duration", 1.5, "+Duration", "uncommon"), mul("slow", 0.85, "+Slow", "uncommon")] },
    { id: "sandbox", name: "Sandbox Trap", icon: "🧪", range: "Trap", archetype: "field",
      color: "sandbox",
      desc: "Containment zone that strongly slows and saps threats.",
      explain: "Detonates suspicious activity safely in isolation.",
      base: { interval: 6.0, duration: 3.0, radius: 84, slow: 0.3, dps: 9 },
      ups: [add("dps", 5, "+Damage", "common"), add("radius", 25, "+Radius", "common"), mul("interval", 0.85, "-Cooldown", "uncommon")] },

    /* ---------- companion ---------- */
    { id: "drone", name: "Threat Hunter Drone", icon: "🚁", range: "Companion", archetype: "companion",
      color: "#93c5fd", starter: true,
      desc: "An orbiting drone auto-shoots the nearest threat.",
      explain: "Proactive threat hunting seeks out intrusions.",
      base: { damage: 12, count: 1, radius: 50, fireInterval: 0.55, range: 320, pspeed: 470 },
      ups: [add("damage", 5, "+Damage", "common"), mul("fireInterval", 0.8, "+Fire Rate", "uncommon"), add("count", 1, "+Drone", "rare", (st) => st.count < 3)] },

    /* ---------- mine ---------- */
    { id: "mine", name: "Containment Mine", icon: "💣", range: "Trap", archetype: "mine",
      color: "#f59e0b",
      desc: "Drops charges that detonate when a threat gets close.",
      explain: "Pre-positioned containment triggers on contact.",
      base: { damage: 30, interval: 2.2, blastR: 70, trigger: 22, maxMines: 6 },
      ups: [add("damage", 10, "+Damage", "common"), add("blastR", 15, "+Blast", "uncommon"), mul("interval", 0.85, "-Cooldown", "uncommon")] },

    /* ---------- wall ---------- */
    { id: "segwall", name: "Network Segmentation Wall", icon: "🧱", range: "Area", archetype: "wall",
      color: "94,234,212",
      desc: "Raises a barrier line that slows + damages crossers.",
      explain: "Segmentation walls off lateral movement.",
      base: { dps: 16, interval: 3.0, duration: 4.0, length: 150, slow: 0.6 },
      ups: [add("dps", 7, "+Damage", "common"), add("duration", 1.5, "+Duration", "uncommon"), add("length", 40, "+Length", "common")] },
  ];

  // id -> def
  CDL.ABILITY_MAP = {};
  for (const def of CDL.ABILITIES) CDL.ABILITY_MAP[def.id] = def;

  // Sources that deal continuous damage (skip the per-hit flash in enemies.js).
  CDL.CONTINUOUS_SRC = {};
  for (const def of CDL.ABILITIES) {
    if (def.archetype === "beam" || def.archetype === "field" || def.archetype === "wall") {
      CDL.CONTINUOUS_SRC[def.id] = 1;
    }
  }

  // Derived lookups used by the incident report + How-to-Play guide.
  CDL.TOOL_META = {};
  CDL.TOOL_ORDER = [];
  CDL.TOOL_INFO = {};
  for (const def of CDL.ABILITIES) {
    CDL.TOOL_META[def.id] = def.name;
    CDL.TOOL_ORDER.push(def.id);
    CDL.TOOL_INFO[def.id] = { icon: def.icon, name: def.name, behavior: def.desc, explain: def.explain };
  }

  // Passive (non-weapon) upgrades — never count toward the tool cap.
  CDL.PASSIVES = [
    { id: "hp", name: "Hardened Core", icon: "❤️", rarity: "common",
      desc: "Reinforce the packet's core.",
      preview: (p) => "Max HP: " + p.maxHp + " → " + (p.maxHp + 20),
      apply: (p) => { p.maxHp += 20; p.hp = Math.min(p.maxHp, p.hp + 15); } },
    { id: "speed", name: "Optimized Routing", icon: "👟", rarity: "common",
      desc: "Reroute through faster links.",
      preview: () => "Move speed: +8%",
      apply: (p) => { p.speed *= 1.08; } },
    { id: "pickup", name: "Telemetry Magnet", icon: "🧲", rarity: "common",
      desc: "Pull telemetry from farther out.",
      preview: () => "Pickup range: +30%",
      apply: (p) => { p.pickupRange *= 1.3; } },
    { id: "backup", name: "Backup Restore", icon: "💾", rarity: "uncommon",
      desc: "Recover health between waves.",
      preview: (p) => "Per-wave heal: " + p.backupHeal + " → " + (p.backupHeal + 12),
      apply: (p) => { p.backupHeal += 12; } },
  ];

  /* ---- Loadout helpers ---- */

  // Build a fresh runtime state object for an ability (copies base stats
  // and adds archetype runtime fields).
  CDL.createToolState = function (id) {
    const def = CDL.ABILITY_MAP[id];
    const st = { id, lvl: 1, cd: 0 };
    for (const k in def.base) st[k] = def.base[k];
    if (def.archetype === "orbit" || def.archetype === "companion") st.angle = 0;
    if (def.archetype === "companion") st.fireCd = 0;
    if (def.archetype === "beam") st.target = null;
    if (def.archetype === "ring") st.flash = 0;
    return st;
  };

  // Grant an ability to the player (respects the active-tool cap).
  // Applies the active Daily Simulation's tool buff, if any.
  CDL.grantTool = function (p, id) {
    if (p.tools[id]) return false;
    if (p.toolOrder.length >= CDL.CONFIG.maxTools) return false;
    const st = CDL.createToolState(id);
    const buffs = CDL.S.dailyMods.toolBuffs;
    if (buffs && buffs[id]) {
      if (st.damage != null) st.damage = Math.round(st.damage * buffs[id]);
      if (st.dps != null) st.dps = Math.round(st.dps * buffs[id]);
    }
    p.tools[id] = st;
    p.toolOrder.push(id);
    return true;
  };

  // 3 distinct random starter abilities — only ones the player has unlocked.
  CDL.starterChoices = function () {
    const un = CDL.Save.data.unlockedTools;
    const pool = CDL.ABILITIES.filter((a) => a.starter && un.indexOf(a.id) !== -1).slice();
    CDL.shuffle(pool);
    return pool.slice(0, 3);
  };

  // Headline numbers for a tool card (handles damage vs dps, cd vs none).
  CDL.toolHeadline = function (st) {
    const dmg = st.damage != null ? st.damage : st.dps;
    const cd = st.interval != null ? st.interval : (st.fireInterval != null ? st.fireInterval : null);
    return { dmg, cd, dot: st.dps != null };
  };
})(window.CDL);
