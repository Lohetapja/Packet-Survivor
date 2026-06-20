/* ============================================================
   upgrades.js — level-up card logic (loadout-aware, v0.5.0)
   ------------------------------------------------------------
   Builds the 3 level-up cards:
     • 1 NEW TOOL card  — a random un-owned damage ability, only
       while the loadout has free slots (< CONFIG.maxTools).
     • the rest         — meaningful UPGRADE cards for OWNED tools
       and PASSIVE cards, weighted so passives don't dominate.
   Cards carry display stats (damage / cooldown / "12 → 17") so the
   player can see why a choice matters.

   Card shape consumed by ui.openUpgrades():
     { kind, rarity, icon, name, range?, desc, stats:[..], apply(p) }
   ============================================================ */

(function (CDL) {
  "use strict";

  // Type badge + rarity badge metadata (used by the card renderer).
  CDL.UPGRADE_TAGS = {
    unlock:  { label: "NEW TOOL", cls: "unlock" },
    upgrade: { label: "UPGRADE",  cls: "upgrade" },
    passive: { label: "PASSIVE",  cls: "passive" },
  };
  CDL.UPGRADE_RARITY = {
    common:   { label: "COMMON",   cls: "common",   weight: 3 },
    uncommon: { label: "UNCOMMON", cls: "uncommon", weight: 2 },
    rare:     { label: "RARE",     cls: "rare",     weight: 1.2 },
  };

  /* ---- Stat formatting for cards ---- */
  const STAT_LABEL = {
    damage: "Damage", dps: "Damage/s", count: "Count", radius: "Radius", size: "Size",
    range: "Range", length: "Length", blastR: "Blast", pierce: "Pierce",
    interval: "Cooldown", duration: "Duration", fireInterval: "Fire rate",
    slow: "Slow", rotSpeed: "Orbit speed",
  };
  function statVal(stat, v) {
    if (stat === "interval" || stat === "duration" || stat === "fireInterval") return v.toFixed(2) + "s";
    if (stat === "slow") return Math.round((1 - v) * 100) + "%";
    if (stat === "rotSpeed") return v.toFixed(1);
    return Math.round(v);
  }

  // Headline display stats for a tool (from its base def, for new-tool cards).
  CDL.toolCardData = function (def) {
    const b = def.base;
    const isDot = b.dps != null;
    const dmg = isDot ? b.dps : b.damage;
    const stats = [(isDot ? "Damage/s: " : "Damage: ") + Math.round(dmg)];
    if (b.interval != null) stats.push("Cooldown: " + b.interval.toFixed(2) + "s");
    else if (b.fireInterval != null) stats.push("Fire rate: " + b.fireInterval.toFixed(2) + "s");
    else stats.push("Continuous");
    if (b.count != null && b.count > 1) stats.push("Count: " + b.count);
    if (b.pierce) stats.push("Pierces " + b.pierce);
    if (b.slow != null && b.slow < 1) stats.push("Slow: " + Math.round((1 - b.slow) * 100) + "%");
    if (def.bonusType === "exfil") stats.push("Bonus vs Exfiltration");
    return { icon: def.icon, name: def.name, range: def.range, desc: def.desc, stats };
  };

  function weaponCard(def) {
    const d = CDL.toolCardData(def);
    return {
      kind: "unlock", rarity: "rare", w: 0,
      icon: d.icon, name: def.name, range: d.range, desc: d.desc, stats: d.stats,
      apply: (p) => CDL.grantTool(p, def.id),
    };
  }

  function upgradeCard(def, st, up) {
    const before = st[up.stat];
    const after = up.mul != null ? before * up.mul : before + up.add;
    const line = STAT_LABEL[up.stat] + ": " + statVal(up.stat, before) + " → " + statVal(up.stat, after);
    const rarity = up.rarity || "common";
    return {
      kind: "upgrade", rarity,
      w: CDL.UPGRADE_RARITY[rarity].weight, // tool upgrades keep full weight
      icon: def.icon, name: def.name + " " + up.label, range: def.range, desc: def.desc,
      stats: [line],
      apply: () => { st[up.stat] = after; st.lvl++; },
    };
  }

  function passiveCard(pas) {
    const rarity = pas.rarity || "common";
    return {
      kind: "passive", rarity,
      w: CDL.UPGRADE_RARITY[rarity].weight * 0.55, // passives a bit rarer so they don't dominate
      icon: pas.icon, name: pas.name, desc: pas.desc,
      stats: [pas.preview(CDL.S.player)],
      apply: (p) => pas.apply(p),
    };
  }

  function weightedPop(pool) {
    let total = 0;
    for (const c of pool) total += c.w;
    let r = Math.random() * total, idx = 0;
    for (; idx < pool.length - 1; idx++) { r -= pool[idx].w; if (r <= 0) break; }
    return pool.splice(idx, 1)[0];
  }

  // Build the level-up choices for the current loadout.
  CDL.buildChoices = function () {
    const p = CDL.S.player;
    const max = CDL.CONFIG.maxTools, total = CDL.CONFIG.levelupCards;
    const cards = [];

    // 1 new-tool card while slots are free and unlocked un-owned tools remain.
    if (p.toolOrder.length < max) {
      const un = CDL.Save.data.unlockedTools;
      const unowned = CDL.ABILITIES.filter((a) => !p.tools[a.id] && un.indexOf(a.id) !== -1);
      if (unowned.length) cards.push(weaponCard(unowned[(Math.random() * unowned.length) | 0]));
    }

    // Upgrade pool: owned-tool upgrades + passives (weighted).
    const pool = [];
    for (const id of p.toolOrder) {
      const def = CDL.ABILITY_MAP[id], st = p.tools[id];
      for (const up of def.ups) {
        if (up.cap && !up.cap(st)) continue;
        pool.push(upgradeCard(def, st, up));
      }
    }
    for (const pas of CDL.PASSIVES) pool.push(passiveCard(pas));

    while (cards.length < total && pool.length) cards.push(weightedPop(pool));
    return cards;
  };
})(window.CDL);
