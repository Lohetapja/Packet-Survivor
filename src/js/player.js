/* ============================================================
   player.js — the Defender Packet: movement, XP, damage, render
   ------------------------------------------------------------
   The player auto-fires all tools (see tools.js); this module
   only handles moving, taking damage, collecting telemetry, and
   levelling up.
   ============================================================ */

(function (CDL) {
  "use strict";

  const { clamp, dist2, CONFIG, W, H } = CDL;

  CDL.Player = {
    // Build a fresh player for a new run.
    create() {
      const c = CONFIG.player;
      return {
        x: W / 2, y: H / 2, r: c.radius,
        hp: c.maxHp, maxHp: c.maxHp,
        speed: c.speed, baseSpeed: c.speed,
        level: 1, xp: 0, xpToNext: CONFIG.xp.base,
        score: 0,
        pickupRange: c.pickupRange,
        invuln: 0,
        tools: CDL.freshTools(),
      };
    },

    // Movement (reads CDL.input, set by game.js) + i-frame countdown.
    update(dt) {
      const S = CDL.S, p = S.player, k = CDL.input;
      let dx = 0, dy = 0;
      if (k.up) dy -= 1;
      if (k.down) dy += 1;
      if (k.left) dx -= 1;
      if (k.right) dx += 1;
      if (dx || dy) {
        const len = Math.hypot(dx, dy);
        p.x += (dx / len) * p.speed * dt;
        p.y += (dy / len) * p.speed * dt;
      }
      p.x = clamp(p.x, p.r, W - p.r);
      p.y = clamp(p.y, p.r, H - p.r);
      if (p.invuln > 0) p.invuln -= dt;
    },

    // Collect XP/telemetry; may trigger one or more queued level-ups.
    gainXp(amount) {
      const S = CDL.S, p = S.player;
      p.xp += amount;
      p.score += amount; // telemetry also nudges score
      S.stats.telemetry += amount;
      while (p.xp >= p.xpToNext) {
        p.xp -= p.xpToNext;
        p.level++;
        p.xpToNext = Math.round(CONFIG.xp.base * Math.pow(CONFIG.xp.growth, p.level - 1));
        S.pendingLevelUps++;
      }
    },

    // Take a hit from a threat. Brief invulnerability follows.
    hit(e) {
      const S = CDL.S, p = S.player;
      p.hp -= e.damage;
      p.invuln = CONFIG.player.invuln;
      // Shake scales a little with the size of the hit (kept subtle).
      S.shake = Math.min(12, 6 + e.damage * 0.18);
      CDL.UI.flashDamage();

      // Track who hurt us most, for the incident report.
      S.stats.dmgByThreat[e.type] = (S.stats.dmgByThreat[e.type] || 0) + e.damage;

      // Shove the player away from the threat a little.
      const ang = Math.atan2(p.y - e.y, p.x - e.x);
      const kb = CONFIG.player.knockbackOnHit;
      p.x = clamp(p.x + Math.cos(ang) * kb, p.r, W - p.r);
      p.y = clamp(p.y + Math.sin(ang) * kb, p.r, H - p.r);

      if (e.type === "ransomware") CDL.UI.feedMsg("Ransomware Cube breached your defenses.", "alert", 1.5);
      else CDL.UI.feedMsg("Hostile contact — defenses hit.", "alert", 1.5);

      if (p.hp <= 0) { p.hp = 0; CDL.Game.over(); }
    },

    // Telemetry pickups drift, magnetize when close, then get collected.
    updatePickups(dt) {
      const S = CDL.S, p = S.player;
      const pr = p.pickupRange * p.pickupRange;
      const cr = (p.r + 8) * (p.r + 8);
      for (let i = S.pickups.length - 1; i >= 0; i--) {
        const g = S.pickups[i];
        g.bob += dt * 4;
        g.x += g.vx * dt; g.y += g.vy * dt;
        g.vx *= 0.9; g.vy *= 0.9;
        g.x = clamp(g.x, 6, W - 6); g.y = clamp(g.y, 6, H - 6);

        const d = dist2(g.x, g.y, p.x, p.y);
        if (d <= pr) {
          const ang = Math.atan2(p.y - g.y, p.x - g.x);
          const pull = 260;
          g.x += Math.cos(ang) * pull * dt;
          g.y += Math.sin(ang) * pull * dt;
        }
        if (d <= cr) {
          CDL.Player.gainXp(g.value);
          CDL.Effects.pickup(g.x, g.y);
          S.pickups.splice(i, 1);
        }
      }
    },

    drawTelemetry(ctx) {
      for (const g of CDL.S.pickups) {
        const s = 1 + Math.sin(g.bob) * 0.18;
        ctx.save();
        ctx.translate(g.x, g.y);
        ctx.rotate(Math.PI / 4);
        ctx.shadowColor = "#34d399"; ctx.shadowBlur = 10;
        ctx.fillStyle = "#34d399";
        const s2 = g.r * s;
        ctx.fillRect(-s2, -s2, s2 * 2, s2 * 2);
        ctx.restore();
      }
    },

    draw(ctx) {
      const S = CDL.S, p = S.player;
      const blink = p.invuln > 0 && Math.floor(S.runTime * 20) % 2 === 0;
      ctx.save();
      ctx.globalAlpha = blink ? 0.4 : 1;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r + 6, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(56,189,248,0.18)"; ctx.fill();
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = "#0ea5e9"; ctx.shadowColor = "#38bdf8"; ctx.shadowBlur = 18;
      ctx.fill(); ctx.shadowBlur = 0;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = "#e0f2fe"; ctx.fill();
      ctx.restore();
    },
  };
})(window.CDL);
