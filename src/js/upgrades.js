/* ============================================================
   upgrades.js — the level-up upgrade pool
   ------------------------------------------------------------
   Each upgrade:
     id        unique key
     name      card title
     icon      emoji glyph
     kind      "unlock"  -> NEW TOOL   (adds a defensive tool)
               "upgrade" -> UPGRADE    (improves an owned tool)
               "passive" -> PASSIVE    (always-on stat / safety net)
     rarity    "common" | "uncommon" | "rare"  (label + draw weight)
     desc      short defensive explanation shown on the card
     available(tools) -> bool   (filters the pool each level-up)
     apply(player, tools) -> void

   ★ TO ADD AN UPGRADE: append an object here. `available` keeps it
     out of the deck until it makes sense (e.g. tool not yet owned).
   ============================================================ */

(function (CDL) {
  "use strict";

  const feed = (m) => CDL.UI.feedMsg(m, "good");

  CDL.UPGRADES = [
    /* ---- Passive: the defender packet itself ---- */
    { id: "hp", name: "Hardened Core", icon: "❤️", kind: "passive", rarity: "common",
      desc: "Reinforce the packet. +20 max health (heals 15 now).",
      available: () => true,
      apply: (p) => { p.maxHp += 20; p.hp = Math.min(p.maxHp, p.hp + 15); } },
    { id: "speed", name: "Optimized Routing", icon: "👟", kind: "passive", rarity: "common",
      desc: "Reroute through faster links. +8% movement speed.",
      available: () => true,
      apply: (p) => { p.speed *= 1.08; } },
    { id: "pickup", name: "Telemetry Magnet", icon: "🧲", kind: "passive", rarity: "common",
      desc: "Pull telemetry from farther out. +30% pickup range.",
      available: () => true,
      apply: (p) => { p.pickupRange *= 1.3; } },

    /* ---- Firewall Pulse (always owned) ---- */
    { id: "fw_dmg", name: "Firewall Pulse +Damage", icon: "🔥", kind: "upgrade", rarity: "common",
      desc: "Stronger packet filtering. +6 pulse damage.",
      available: (t) => t.firewall.owned,
      apply: (p, t) => { t.firewall.damage += 6; t.firewall.level++; } },
    { id: "fw_range", name: "Firewall Pulse +Range", icon: "🔥", kind: "upgrade", rarity: "common",
      desc: "Wider perimeter coverage. +22 pulse range.",
      available: (t) => t.firewall.owned,
      apply: (p, t) => { t.firewall.range += 22; t.firewall.level++; } },
    { id: "fw_rate", name: "Firewall Pulse +Rate", icon: "🔥", kind: "upgrade", rarity: "uncommon",
      desc: "Tighter rule processing. Pulse fires 14% faster.",
      available: (t) => t.firewall.owned,
      apply: (p, t) => { t.firewall.interval *= 0.86; t.firewall.level++; } },

    /* ---- EDR Burst ---- */
    { id: "edr_unlock", name: "EDR Burst", icon: "✳️", kind: "unlock", rarity: "rare",
      desc: "Fires tracking bursts. Extra-effective vs Malware & Ransomware.",
      available: (t) => !t.edr.owned,
      apply: (p, t) => { t.edr.owned = true; t.edr.level = 1; feed("EDR Burst deployed."); } },
    { id: "edr_proj", name: "EDR Burst +Projectile", icon: "✳️", kind: "upgrade", rarity: "uncommon",
      desc: "Parallel detections. +1 projectile per burst.",
      available: (t) => t.edr.owned,
      apply: (p, t) => { t.edr.projectiles += 1; t.edr.level++; } },
    { id: "edr_dmg", name: "EDR Burst +Damage", icon: "✳️", kind: "upgrade", rarity: "common",
      desc: "Sharper remediation. +6 projectile damage.",
      available: (t) => t.edr.owned,
      apply: (p, t) => { t.edr.damage += 6; t.edr.level++; } },

    /* ---- SIEM Scanner ---- */
    { id: "siem_unlock", name: "SIEM Scanner", icon: "📡", kind: "unlock", rarity: "rare",
      desc: "A scan ring damages nearby threats and yields bonus telemetry.",
      available: (t) => !t.siem.owned,
      apply: (p, t) => { t.siem.owned = true; t.siem.level = 1; feed("SIEM Scanner online."); } },
    { id: "siem_radius", name: "SIEM Scanner +Radius", icon: "📡", kind: "upgrade", rarity: "uncommon",
      desc: "Broader log collection. +24 scan radius.",
      available: (t) => t.siem.owned,
      apply: (p, t) => { t.siem.radius += 24; t.siem.level++; } },
    { id: "siem_dmg", name: "SIEM Scanner +Damage", icon: "📡", kind: "upgrade", rarity: "common",
      desc: "Better correlation rules. +5 scan damage.",
      available: (t) => t.siem.owned,
      apply: (p, t) => { t.siem.damage += 5; t.siem.level++; } },

    /* ---- DNS Sinkhole ---- */
    { id: "dns_unlock", name: "DNS Sinkhole Field", icon: "🕳️", kind: "unlock", rarity: "rare",
      desc: "Drops a field that slows threats caught inside it.",
      available: (t) => !t.dns.owned,
      apply: (p, t) => { t.dns.owned = true; t.dns.level = 1; feed("DNS Sinkhole armed."); } },
    { id: "dns_dur", name: "DNS Sinkhole +Duration", icon: "🕳️", kind: "upgrade", rarity: "uncommon",
      desc: "Persistent blocklist. Field lasts +1.5s.",
      available: (t) => t.dns.owned,
      apply: (p, t) => { t.dns.duration += 1.5; t.dns.level++; } },
    { id: "dns_radius", name: "DNS Sinkhole +Radius", icon: "🕳️", kind: "upgrade", rarity: "uncommon",
      desc: "Wider sinkhole. +25 field radius.",
      available: (t) => t.dns.owned,
      apply: (p, t) => { t.dns.radius += 25; t.dns.level++; } },

    /* ---- MFA Shield ---- */
    { id: "mfa_unlock", name: "MFA Shield", icon: "🛡️", kind: "unlock", rarity: "rare",
      desc: "Rotating shields block and damage threats that touch you.",
      available: (t) => !t.mfa.owned,
      apply: (p, t) => { t.mfa.owned = true; t.mfa.level = 1; feed("MFA Shield active."); } },
    { id: "mfa_count", name: "MFA Shield +Node", icon: "🛡️", kind: "upgrade", rarity: "uncommon",
      desc: "Add an auth factor. +1 rotating shield node.",
      available: (t) => t.mfa.owned,
      apply: (p, t) => { t.mfa.count += 1; t.mfa.level++; } },
    { id: "mfa_speed", name: "MFA Shield +Speed", icon: "🛡️", kind: "upgrade", rarity: "uncommon",
      desc: "Faster challenge cycles. Shields rotate 25% faster.",
      available: (t) => t.mfa.owned,
      apply: (p, t) => { t.mfa.rotSpeed *= 1.25; t.mfa.level++; } },

    /* ---- Honeypot Decoy ---- */
    { id: "hp_unlock", name: "Honeypot Decoy", icon: "🍯", kind: "unlock", rarity: "rare",
      desc: "Deploys a lure that distracts threats away from you.",
      available: (t) => !t.honeypot.owned,
      apply: (p, t) => { t.honeypot.owned = true; t.honeypot.level = 1; feed("Honeypot ready."); } },
    { id: "hp_cd", name: "Honeypot -Cooldown", icon: "🍯", kind: "upgrade", rarity: "uncommon",
      desc: "Deploy lures more often. 20% shorter cooldown.",
      available: (t) => t.honeypot.owned,
      apply: (p, t) => { t.honeypot.interval *= 0.8; t.honeypot.level++; } },
    { id: "hp_dur", name: "Honeypot +Duration", icon: "🍯", kind: "upgrade", rarity: "uncommon",
      desc: "Stickier lure. Decoy lasts +2s.",
      available: (t) => t.honeypot.owned,
      apply: (p, t) => { t.honeypot.duration += 2; t.honeypot.level++; } },

    /* ---- Quarantine Beam ---- */
    { id: "quar_unlock", name: "Quarantine Beam", icon: "🎯", kind: "unlock", rarity: "rare",
      desc: "Beams the closest threat with steady damage over time.",
      available: (t) => !t.quarantine.owned,
      apply: (p, t) => { t.quarantine.owned = true; t.quarantine.level = 1; feed("Quarantine Beam locked on."); } },
    { id: "quar_dmg", name: "Quarantine Beam +Damage", icon: "🎯", kind: "upgrade", rarity: "uncommon",
      desc: "Tighter containment. +12 beam damage per second.",
      available: (t) => t.quarantine.owned,
      apply: (p, t) => { t.quarantine.dps += 12; t.quarantine.level++; } },
    { id: "quar_range", name: "Quarantine Beam +Range", icon: "🎯", kind: "upgrade", rarity: "uncommon",
      desc: "Extended reach. +50 beam range.",
      available: (t) => t.quarantine.owned,
      apply: (p, t) => { t.quarantine.range += 50; t.quarantine.level++; } },

    /* ---- Backup Restore (passive safety net) ---- */
    { id: "backup_unlock", name: "Backup Restore", icon: "💾", kind: "passive", rarity: "rare",
      desc: "Passively restores some health after each wave you survive.",
      available: (t) => !t.backup.owned,
      apply: (p, t) => { t.backup.owned = true; t.backup.level = 1; feed("Backup Restore configured."); } },
    { id: "backup_amt", name: "Backup Restore +Healing", icon: "💾", kind: "passive", rarity: "common",
      desc: "Faster recovery. +6 health restored each wave.",
      available: (t) => t.backup.owned,
      apply: (p, t) => { t.backup.amount += 6; t.backup.level++; } },

    /* ============ v0.4.0 new tools ============ */

    /* ---- Packet Storm ---- */
    { id: "ps_unlock", name: "Packet Storm", icon: "💠", kind: "unlock", rarity: "rare",
      desc: "Burst-fire defensive packets in all directions. Clears weak swarms.",
      available: (t) => !t.packetstorm.owned,
      apply: (p, t) => { t.packetstorm.owned = true; t.packetstorm.level = 1; feed("Packet Storm online."); } },
    { id: "ps_dmg", name: "Packet Storm +Damage", icon: "💠", kind: "upgrade", rarity: "common",
      desc: "Harder-hitting packets. +5 damage.",
      available: (t) => t.packetstorm.owned, apply: (p, t) => { t.packetstorm.damage += 5; t.packetstorm.level++; } },
    { id: "ps_count", name: "Packet Storm +Packets", icon: "💠", kind: "upgrade", rarity: "uncommon",
      desc: "Denser volley. +2 packets per burst.",
      available: (t) => t.packetstorm.owned, apply: (p, t) => { t.packetstorm.count += 2; t.packetstorm.level++; } },
    { id: "ps_cd", name: "Packet Storm -Cooldown", icon: "💠", kind: "upgrade", rarity: "uncommon",
      desc: "Fire more often. 15% shorter cooldown.",
      available: (t) => t.packetstorm.owned, apply: (p, t) => { t.packetstorm.interval *= 0.85; t.packetstorm.level++; } },

    /* ---- Threat Hunter Drone ---- */
    { id: "dr_unlock", name: "Threat Hunter Drone", icon: "🚁", kind: "unlock", rarity: "rare",
      desc: "Deploy a drone that orbits you and auto-shoots nearby threats.",
      available: (t) => !t.drone.owned,
      apply: (p, t) => { t.drone.owned = true; t.drone.level = 1; feed("Threat Hunter Drone deployed."); } },
    { id: "dr_dmg", name: "Threat Hunter +Damage", icon: "🚁", kind: "upgrade", rarity: "common",
      desc: "Stronger rounds. +5 drone damage.",
      available: (t) => t.drone.owned, apply: (p, t) => { t.drone.damage += 5; t.drone.level++; } },
    { id: "dr_rate", name: "Threat Hunter +Fire Rate", icon: "🚁", kind: "upgrade", rarity: "uncommon",
      desc: "Faster targeting. Fires 20% faster.",
      available: (t) => t.drone.owned, apply: (p, t) => { t.drone.fireInterval *= 0.8; t.drone.level++; } },
    { id: "dr_count", name: "Threat Hunter +Drone", icon: "🚁", kind: "upgrade", rarity: "rare",
      desc: "Deploy an additional hunter drone (max 3).",
      available: (t) => t.drone.owned && t.drone.count < 3, apply: (p, t) => { t.drone.count += 1; t.drone.level++; } },

    /* ---- Patch Wave ---- */
    { id: "pw_unlock", name: "Patch Wave", icon: "🩹", kind: "unlock", rarity: "rare",
      desc: "Release a periodic remediation wave around the player.",
      available: (t) => !t.patchwave.owned,
      apply: (p, t) => { t.patchwave.owned = true; t.patchwave.level = 1; feed("Patch Wave rolling out."); } },
    { id: "pw_radius", name: "Patch Wave +Radius", icon: "🩹", kind: "upgrade", rarity: "common",
      desc: "Wider coverage. +30 wave radius.",
      available: (t) => t.patchwave.owned, apply: (p, t) => { t.patchwave.radius += 30; t.patchwave.level++; } },
    { id: "pw_dmg", name: "Patch Wave +Damage", icon: "🩹", kind: "upgrade", rarity: "common",
      desc: "Deeper remediation. +7 wave damage.",
      available: (t) => t.patchwave.owned, apply: (p, t) => { t.patchwave.damage += 7; t.patchwave.level++; } },
    { id: "pw_cd", name: "Patch Wave -Cooldown", icon: "🩹", kind: "upgrade", rarity: "uncommon",
      desc: "Patch faster. 15% shorter cooldown.",
      available: (t) => t.patchwave.owned, apply: (p, t) => { t.patchwave.interval *= 0.85; t.patchwave.level++; } },

    /* ---- DLP Net ---- */
    { id: "dlp_unlock", name: "DLP Net", icon: "🕸️", kind: "unlock", rarity: "rare",
      desc: "Slow and damage threats inside a net. Extra-effective vs Exfiltration.",
      available: (t) => !t.dlp.owned,
      apply: (p, t) => { t.dlp.owned = true; t.dlp.level = 1; feed("DLP Net armed."); } },
    { id: "dlp_dmg", name: "DLP Net +Damage", icon: "🕸️", kind: "upgrade", rarity: "common",
      desc: "Tighter inspection. +6 net damage per second.",
      available: (t) => t.dlp.owned, apply: (p, t) => { t.dlp.dps += 6; t.dlp.level++; } },
    { id: "dlp_dur", name: "DLP Net +Duration", icon: "🕸️", kind: "upgrade", rarity: "uncommon",
      desc: "Lingers longer. Net lasts +1.5s.",
      available: (t) => t.dlp.owned, apply: (p, t) => { t.dlp.duration += 1.5; t.dlp.level++; } },
    { id: "dlp_slow", name: "DLP Net +Slow", icon: "🕸️", kind: "upgrade", rarity: "uncommon",
      desc: "Stickier net. Slows trapped threats more.",
      available: (t) => t.dlp.owned, apply: (p, t) => { t.dlp.slow *= 0.82; t.dlp.level++; } },

    /* ---- Log Shredder ---- */
    { id: "sh_unlock", name: "Log Shredder", icon: "🌀", kind: "unlock", rarity: "rare",
      desc: "An orbiting telemetry shard shreds threats it touches.",
      available: (t) => !t.shredder.owned,
      apply: (p, t) => { t.shredder.owned = true; t.shredder.level = 1; feed("Log Shredder spinning up."); } },
    { id: "sh_dmg", name: "Log Shredder +Damage", icon: "🌀", kind: "upgrade", rarity: "common",
      desc: "Sharper shards. +6 shredder damage.",
      available: (t) => t.shredder.owned, apply: (p, t) => { t.shredder.damage += 6; t.shredder.level++; } },
    { id: "sh_speed", name: "Log Shredder +Speed", icon: "🌀", kind: "upgrade", rarity: "uncommon",
      desc: "Faster orbit. Spins 25% faster.",
      available: (t) => t.shredder.owned, apply: (p, t) => { t.shredder.rotSpeed *= 1.25; t.shredder.level++; } },
    { id: "sh_size", name: "Log Shredder +Size", icon: "🌀", kind: "upgrade", rarity: "uncommon",
      desc: "Bigger arc. Larger shard and reach.",
      available: (t) => t.shredder.owned, apply: (p, t) => { t.shredder.size += 5; t.shredder.radius += 6; t.shredder.level++; } },

    /* ---- Sandbox Trap ---- */
    { id: "sb_unlock", name: "Sandbox Trap", icon: "🧪", kind: "unlock", rarity: "rare",
      desc: "Deploy a containment zone that slows and saps trapped threats.",
      available: (t) => !t.sandbox.owned,
      apply: (p, t) => { t.sandbox.owned = true; t.sandbox.level = 1; feed("Sandbox Trap ready."); } },
    { id: "sb_radius", name: "Sandbox Trap +Radius", icon: "🧪", kind: "upgrade", rarity: "common",
      desc: "Larger zone. +25 sandbox radius.",
      available: (t) => t.sandbox.owned, apply: (p, t) => { t.sandbox.radius += 25; t.sandbox.level++; } },
    { id: "sb_dur", name: "Sandbox Trap +Duration", icon: "🧪", kind: "upgrade", rarity: "uncommon",
      desc: "Holds longer. Zone lasts +1.5s.",
      available: (t) => t.sandbox.owned, apply: (p, t) => { t.sandbox.duration += 1.5; t.sandbox.level++; } },
    { id: "sb_cd", name: "Sandbox Trap -Cooldown", icon: "🧪", kind: "upgrade", rarity: "uncommon",
      desc: "Deploy more often. 15% shorter cooldown.",
      available: (t) => t.sandbox.owned, apply: (p, t) => { t.sandbox.interval *= 0.85; t.sandbox.level++; } },
  ];

  // Tag text + css class per kind (the type badge on a card).
  CDL.UPGRADE_TAGS = {
    unlock:  { label: "NEW TOOL", cls: "unlock" },
    upgrade: { label: "UPGRADE",  cls: "upgrade" },
    passive: { label: "PASSIVE",  cls: "passive" },
  };

  // Label + css class per rarity (the rarity badge on a card).
  CDL.UPGRADE_RARITY = {
    common:   { label: "COMMON",   cls: "common",   weight: 3 },
    uncommon: { label: "UNCOMMON", cls: "uncommon", weight: 2 },
    rare:     { label: "RARE",     cls: "rare",     weight: 1.2 },
  };

  // Pick 3 distinct, currently-valid upgrades, weighted by rarity so
  // rares feel like a find. NEW TOOL cards get a small early-game bias so
  // players build variety quickly (purely soft weighting, not power tiers).
  CDL.buildChoices = function () {
    const pool = CDL.UPGRADES.filter((u) => u.available(CDL.S.player.tools)).slice();
    const rar = (u) => (CDL.UPGRADE_RARITY[u.rarity] || CDL.UPGRADE_RARITY.common).weight;
    const unlockBias = CDL.S.player.level <= 6 ? 1.5 : 1.0; // favour new tools early
    const wOf = (u) => rar(u) * (u.kind === "unlock" ? unlockBias : 1);
    const out = [];
    while (out.length < 3 && pool.length) {
      let total = 0;
      for (const u of pool) total += wOf(u);
      let r = Math.random() * total, idx = 0;
      for (; idx < pool.length - 1; idx++) { r -= wOf(pool[idx]); if (r <= 0) break; }
      out.push(pool.splice(idx, 1)[0]);
    }
    return out;
  };
})(window.CDL);
