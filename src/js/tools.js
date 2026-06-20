/* ============================================================
   tools.js — the ability ENGINE (archetype behaviours + render)
   ------------------------------------------------------------
   Ability DATA lives in abilities.js. This file runs whatever the
   player owns: it iterates player.toolOrder and dispatches each
   tool to its archetype handler, then renders the shared effect
   arrays (projectiles, pulses, fields, mines, walls) plus the
   per-tool visuals (rings, beams, orbit nodes, drones).

   Damage credit uses the tool id as `source`, so the incident
   report's "most effective defense" works automatically.
   ============================================================ */

(function (CDL) {
  "use strict";

  const { dist2, clamp, rand } = CDL;

  // Per-archetype update behaviour. `st` = runtime tool state, `def` = ability def.
  const ARCH = {
    /* Expanding ring AoE around the player (optional knockback). */
    pulse(st, def, dt) {
      const S = CDL.S, p = S.player;
      st.cd -= dt;
      if (st.cd > 0) return;
      st.cd = st.interval;
      S.pulses.push({ x: p.x, y: p.y, r: 0, maxR: st.radius, life: 0.4, maxLife: 0.4, color: def.color });
      const rr = st.radius * st.radius;
      for (let i = S.enemies.length - 1; i >= 0; i--) {
        const e = S.enemies[i];
        if (dist2(e.x, e.y, p.x, p.y) <= rr) {
          if (st.knockback) {
            const a = Math.atan2(e.y - p.y, e.x - p.x);
            e.vx += Math.cos(a) * st.knockback; e.vy += Math.sin(a) * st.knockback;
          }
          CDL.damageEnemy(e, st.damage, st.id);
        }
      }
    },

    /* Burst of projectiles — full circle, or an aimed cone. */
    radial(st, def, dt) {
      const S = CDL.S, p = S.player;
      st.cd -= dt;
      if (st.cd > 0) return;
      st.cd = st.interval;
      const n = st.count;
      let base;
      if (st.aimed) {
        const t = CDL.Enemies.nearest(1, 9999)[0];
        base = t ? Math.atan2(t.y - p.y, t.x - p.x) : Math.random() * 6.28;
      } else { base = S.runTime; }
      for (let k = 0; k < n; k++) {
        const a = st.aimed
          ? base + (n > 1 ? (k / (n - 1) - 0.5) * st.spread : 0)
          : base + (Math.PI * 2 * k) / n;
        pushProjectile(p.x, p.y, a, st.pspeed, st.damage, 4, st.life, st.id, def.color, false, 0);
      }
    },

    /* Homing-straight shots at the nearest target(s). */
    projectile(st, def, dt) {
      const S = CDL.S, p = S.player;
      st.cd -= dt;
      if (st.cd > 0) return;
      if (st.sameTarget) {
        const t = CDL.Enemies.nearest(1, st.range)[0];
        if (!t) return;
        st.cd = st.interval;
        for (let k = 0; k < st.count; k++) {
          const jitter = st.count > 1 ? (k - (st.count - 1) / 2) * 0.14 : 0;
          const a = Math.atan2(t.y - p.y, t.x - p.x) + jitter;
          pushProjectile(p.x, p.y, a, st.pspeed, st.damage, 5, 1.4, st.id, def.color, st.bonus, st.pierce);
        }
      } else {
        const targets = CDL.Enemies.nearest(st.count, st.range);
        if (!targets.length) return;
        st.cd = st.interval;
        for (const e of targets) {
          const a = Math.atan2(e.y - p.y, e.x - p.x);
          pushProjectile(p.x, p.y, a, st.pspeed, st.damage, 5, 1.4, st.id, def.color, st.bonus, st.pierce);
        }
      }
    },

    /* Persistent damaging ring at a fixed radius. */
    ring(st, def, dt) {
      const S = CDL.S, p = S.player;
      st.cd -= dt;
      if (st.flash > 0) st.flash -= dt;
      if (st.cd > 0) return;
      st.cd = st.interval; st.flash = 0.3;
      const rr = st.radius * st.radius;
      for (let i = S.enemies.length - 1; i >= 0; i--) {
        const e = S.enemies[i];
        if (dist2(e.x, e.y, p.x, p.y) <= rr) CDL.damageEnemy(e, st.damage, st.id);
      }
    },

    /* Orbiting node(s) that damage on contact. */
    orbit(st, def, dt) {
      const S = CDL.S, p = S.player;
      st.angle += st.rotSpeed * dt;
      const step = (Math.PI * 2) / st.count;
      for (let nidx = 0; nidx < st.count; nidx++) {
        const a = st.angle + step * nidx;
        const ox = p.x + Math.cos(a) * st.radius, oy = p.y + Math.sin(a) * st.radius;
        for (let i = S.enemies.length - 1; i >= 0; i--) {
          const e = S.enemies[i];
          if (e.orbitCd > 0) continue;
          const rad = e.r + st.size;
          if (dist2(e.x, e.y, ox, oy) <= rad * rad) { e.orbitCd = 0.3; CDL.damageEnemy(e, st.damage, st.id); }
        }
      }
    },

    /* Lock a target (nearest / highest-HP) and beam steady DoT. */
    beam(st, def, dt) {
      const S = CDL.S, p = S.player;
      st.target = null;
      let target = null;
      if (def.mode === "highhp") {
        const rr = st.range * st.range; let bh = -1;
        for (const e of S.enemies) {
          if (dist2(e.x, e.y, p.x, p.y) <= rr && e.hp > bh) { bh = e.hp; target = e; }
        }
      } else {
        target = CDL.Enemies.nearest(1, st.range)[0] || null;
      }
      if (target) { st.target = target; CDL.damageEnemy(target, st.dps * dt, st.id); }
    },

    /* Drop a slowing + damaging field (DoT applied in enemies.js). */
    field(st, def, dt) {
      const S = CDL.S;
      st.cd -= dt;
      if (st.cd > 0 || !S.enemies.length) return;
      st.cd = st.interval;
      const tgt = S.enemies[(Math.random() * S.enemies.length) | 0];
      S.fields.push({
        x: tgt.x, y: tgt.y, r: st.radius, slow: st.slow, dps: st.dps,
        life: st.duration, maxLife: st.duration, kind: def.color, src: st.id, bonusType: def.bonusType,
      });
    },

    /* Orbiting companion drone(s) that auto-fire at the nearest threat. */
    companion(st, def, dt) {
      const S = CDL.S, p = S.player;
      st.angle += 1.4 * dt;
      st.fireCd -= dt;
      if (st.fireCd > 0) return;
      const targets = CDL.Enemies.nearest(st.count, st.range);
      if (!targets.length) return;
      st.fireCd = st.fireInterval;
      const step = (Math.PI * 2) / st.count;
      for (let nidx = 0; nidx < st.count; nidx++) {
        const a = st.angle + step * nidx;
        const ox = p.x + Math.cos(a) * st.radius, oy = p.y + Math.sin(a) * st.radius;
        const e = targets[nidx % targets.length];
        const ang = Math.atan2(e.y - oy, e.x - ox);
        pushProjectile(ox, oy, ang, st.pspeed, st.damage, 4, 1.2, st.id, def.color, false, 0);
      }
    },

    /* Drop charges that detonate when a threat gets close. */
    mine(st, def, dt) {
      const S = CDL.S, p = S.player;
      st.cd -= dt;
      if (st.cd > 0) return;
      st.cd = st.interval;
      let count = 0;
      for (const m of S.mines) if (m.src === st.id) count++;
      if (count >= st.maxMines) return;
      const a = Math.random() * Math.PI * 2, d = rand(40, 120);
      S.mines.push({
        x: clamp(p.x + Math.cos(a) * d, 20, CDL.W - 20),
        y: clamp(p.y + Math.sin(a) * d, 20, CDL.H - 20),
        trigger: st.trigger, blastR: st.blastR, dmg: st.damage, src: st.id, color: def.color, bob: 0,
      });
    },

    /* Raise a temporary barrier line (slow + DoT applied in enemies.js). */
    wall(st, def, dt) {
      const S = CDL.S, p = S.player;
      st.cd -= dt;
      if (st.cd > 0 || !S.enemies.length) return;
      st.cd = st.interval;
      const a = Math.random() * Math.PI * 2;
      const cx = clamp(p.x + Math.cos(a) * 90, 40, CDL.W - 40);
      const cy = clamp(p.y + Math.sin(a) * 90, 40, CDL.H - 40);
      const ang = Math.random() * Math.PI;
      const hx = Math.cos(ang) * st.length / 2, hy = Math.sin(ang) * st.length / 2;
      S.walls.push({
        x1: cx - hx, y1: cy - hy, x2: cx + hx, y2: cy + hy,
        dps: st.dps, slow: st.slow, src: st.id, color: def.color, life: st.duration, maxLife: st.duration,
      });
    },
  };

  // Helper: push a projectile with a normalized shape (pierce + hit-set).
  function pushProjectile(x, y, ang, speed, dmg, r, life, source, color, bonus, pierce) {
    CDL.S.projectiles.push({
      x, y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed,
      dmg, r, life, source, color, bonus: !!bonus, pierce: pierce | 0, hits: [],
    });
  }

  CDL.Tools = {
    /* ---- Run every owned tool ---- */
    update(dt) {
      const p = CDL.S.player;
      for (const id of p.toolOrder) {
        const st = p.tools[id], def = CDL.ABILITY_MAP[id];
        ARCH[def.archetype](st, def, dt);
      }
    },

    /* ---- Projectiles (shared) ---- */
    updateProjectiles(dt) {
      const S = CDL.S;
      for (let i = S.projectiles.length - 1; i >= 0; i--) {
        const pr = S.projectiles[i];
        pr.x += pr.vx * dt; pr.y += pr.vy * dt; pr.life -= dt;
        let remove = pr.life <= 0 || pr.x < -20 || pr.x > CDL.W + 20 || pr.y < -20 || pr.y > CDL.H + 20;
        if (!remove) {
          for (let j = 0; j < S.enemies.length; j++) {
            const e = S.enemies[j];
            if (pr.hits.indexOf(e) !== -1) continue;
            const rad = e.r + pr.r;
            if (dist2(e.x, e.y, pr.x, pr.y) <= rad * rad) {
              let d = pr.dmg;
              if (pr.bonus && (e.type === "malware" || e.type === "ransomware")) d *= 1.5;
              pr.hits.push(e);
              if (CDL.damageEnemy(e, d, pr.source || "edr")) j--; // enemy removed → fix index
              if (pr.pierce <= pr.hits.length - 1) { remove = true; break; }
            }
          }
        }
        if (remove) S.projectiles.splice(i, 1);
      }
    },

    /* ---- Pulses, fields, mines, walls (timers + triggers) ---- */
    updateEffects(dt) {
      const S = CDL.S;
      for (let i = S.pulses.length - 1; i >= 0; i--) {
        const p = S.pulses[i];
        p.life -= dt;
        p.r = p.maxR * (1 - p.life / p.maxLife);
        if (p.life <= 0) S.pulses.splice(i, 1);
      }
      for (let i = S.fields.length - 1; i >= 0; i--) {
        S.fields[i].life -= dt;
        if (S.fields[i].life <= 0) S.fields.splice(i, 1);
      }
      // Mines detonate when any threat enters the trigger radius.
      for (let i = S.mines.length - 1; i >= 0; i--) {
        const m = S.mines[i]; m.bob += dt * 4;
        let trig = false;
        for (const e of S.enemies) {
          const tr = m.trigger + e.r;
          if (dist2(e.x, e.y, m.x, m.y) <= tr * tr) { trig = true; break; }
        }
        if (trig) {
          const rr = m.blastR * m.blastR;
          for (let j = S.enemies.length - 1; j >= 0; j--) {
            const e = S.enemies[j];
            if (dist2(e.x, e.y, m.x, m.y) <= rr) CDL.damageEnemy(e, m.dmg, m.src);
          }
          S.pulses.push({ x: m.x, y: m.y, r: 0, maxR: m.blastR, life: 0.35, maxLife: 0.35, color: "245,158,11" });
          CDL.Effects.death(m.x, m.y, "#f59e0b");
          S.mines.splice(i, 1);
        }
      }
      for (let i = S.walls.length - 1; i >= 0; i--) {
        S.walls[i].life -= dt;
        if (S.walls[i].life <= 0) S.walls.splice(i, 1);
      }
    },

    /* ---- Rendering, by z-layer (called from game.js render) ---- */

    // Below enemies: fields, walls, mines, legacy decoys.
    drawGround(ctx) {
      const S = CDL.S;
      for (const f of S.fields) drawField(ctx, f);
      for (const w of S.walls) {
        const a = 0.25 + 0.4 * (w.life / w.maxLife);
        ctx.lineCap = "round";
        ctx.strokeStyle = "rgba(" + w.color + "," + a + ")"; ctx.lineWidth = 9;
        ctx.beginPath(); ctx.moveTo(w.x1, w.y1); ctx.lineTo(w.x2, w.y2); ctx.stroke();
        ctx.strokeStyle = "rgba(" + w.color + ",0.9)"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(w.x1, w.y1); ctx.lineTo(w.x2, w.y2); ctx.stroke();
        ctx.lineCap = "butt";
      }
      for (const m of S.mines) {
        const s = 1 + Math.sin(m.bob) * 0.2;
        ctx.beginPath(); ctx.arc(m.x, m.y, 5 * s, 0, Math.PI * 2);
        ctx.fillStyle = m.color; ctx.shadowColor = m.color; ctx.shadowBlur = 10; ctx.fill(); ctx.shadowBlur = 0;
        ctx.beginPath(); ctx.arc(m.x, m.y, m.trigger, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(245,158,11,0.22)"; ctx.lineWidth = 1; ctx.stroke();
      }
      for (const d of S.decoys) {
        ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(251,191,36,0.25)"; ctx.fill();
        ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 2; ctx.stroke();
      }
    },

    // Player-centred auras: damaging rings + beams.
    drawAuras(ctx) {
      const S = CDL.S, p = S.player;
      for (const id of p.toolOrder) {
        const st = p.tools[id], def = CDL.ABILITY_MAP[id];
        if (def.archetype === "ring") {
          ctx.beginPath(); ctx.arc(p.x, p.y, st.radius, 0, Math.PI * 2);
          ctx.strokeStyle = st.flash > 0 ? "rgba(" + def.color + ",0.85)" : "rgba(" + def.color + ",0.26)";
          ctx.lineWidth = st.flash > 0 ? 3 : 1.5; ctx.stroke();
        } else if (def.archetype === "beam" && st.target && S.enemies.indexOf(st.target) !== -1) {
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(st.target.x, st.target.y);
          ctx.strokeStyle = "rgba(" + def.color + ",0.85)"; ctx.lineWidth = 3;
          ctx.shadowColor = "rgba(" + def.color + ",1)"; ctx.shadowBlur = 12; ctx.stroke(); ctx.shadowBlur = 0;
        }
      }
    },

    drawPulses(ctx) {
      for (const p of CDL.S.pulses) {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(" + (p.color || "56,189,248") + "," + (p.life / p.maxLife) + ")";
        ctx.lineWidth = 4; ctx.stroke();
      }
    },

    // Above enemies: projectiles, orbit nodes, companion drones.
    drawOver(ctx) {
      const S = CDL.S, p = S.player;
      for (const pr of S.projectiles) {
        const c = pr.color || "#7dd3fc";
        ctx.beginPath(); ctx.arc(pr.x, pr.y, pr.r, 0, Math.PI * 2);
        ctx.fillStyle = c; ctx.shadowColor = c; ctx.shadowBlur = 10; ctx.fill(); ctx.shadowBlur = 0;
      }
      for (const id of p.toolOrder) {
        const st = p.tools[id], def = CDL.ABILITY_MAP[id];
        if (def.archetype === "orbit") {
          const step = (Math.PI * 2) / st.count;
          for (let n = 0; n < st.count; n++) {
            const a = st.angle + step * n;
            const ox = p.x + Math.cos(a) * st.radius, oy = p.y + Math.sin(a) * st.radius;
            ctx.save(); ctx.translate(ox, oy); ctx.rotate(a);
            ctx.fillStyle = def.color; ctx.strokeStyle = def.color;
            ctx.shadowColor = def.color; ctx.shadowBlur = 10;
            if (def.shape === "arc") {
              ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, st.size, -0.6, 0.6); ctx.stroke();
            } else if (def.shape === "shard") {
              ctx.fillRect(-st.size * 0.5, -st.size * 0.5, st.size, st.size);
            } else {
              ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.fill();
            }
            ctx.restore(); ctx.shadowBlur = 0;
          }
        } else if (def.archetype === "companion") {
          const step = (Math.PI * 2) / st.count;
          for (let n = 0; n < st.count; n++) {
            const a = st.angle + step * n;
            const ox = p.x + Math.cos(a) * st.radius, oy = p.y + Math.sin(a) * st.radius;
            ctx.beginPath(); ctx.arc(ox, oy, 5, 0, Math.PI * 2);
            ctx.fillStyle = def.color; ctx.shadowColor = def.color; ctx.shadowBlur = 10; ctx.fill(); ctx.shadowBlur = 0;
            ctx.beginPath(); ctx.arc(ox, oy, 8, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(147,197,253,0.5)"; ctx.lineWidth = 1; ctx.stroke();
          }
        }
      }
    },
  };

  function drawField(ctx, f) {
    const a = 0.12 + 0.1 * (f.life / f.maxLife);
    if (f.kind === "sandbox") {
      ctx.fillStyle = "rgba(167,139,250," + a + ")";
      ctx.fillRect(f.x - f.r, f.y - f.r, f.r * 2, f.r * 2);
      ctx.strokeStyle = "rgba(167,139,250,0.7)"; ctx.lineWidth = 2;
      ctx.strokeRect(f.x - f.r, f.y - f.r, f.r * 2, f.r * 2);
    } else if (f.kind === "dlp") {
      ctx.fillStyle = "rgba(52,211,153," + (a * 0.8) + ")";
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.fill();
      ctx.save();
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.clip();
      ctx.strokeStyle = "rgba(52,211,153,0.4)"; ctx.lineWidth = 1;
      for (let g = -f.r; g <= f.r; g += 12) {
        ctx.beginPath(); ctx.moveTo(f.x + g, f.y - f.r); ctx.lineTo(f.x + g, f.y + f.r); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(f.x - f.r, f.y + g); ctx.lineTo(f.x + f.r, f.y + g); ctx.stroke();
      }
      ctx.restore();
      ctx.strokeStyle = "rgba(52,211,153,0.6)"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.stroke();
    } else { // dns / default
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(56,189,248," + a + ")"; ctx.fill();
      ctx.strokeStyle = "rgba(56,189,248,0.5)";
      ctx.setLineDash([6, 6]); ctx.stroke(); ctx.setLineDash([]);
    }
  }
})(window.CDL);
