/* ============================================================
   tools.js — defensive tools: state, auto-activation, rendering
   ------------------------------------------------------------
   Every tool is DEFENSIVE / detection / containment themed. They
   auto-activate; the player never aims.

   ★ TO ADD A NEW TOOL:
     1. Add default state to freshTools() below.
     2. Add its behaviour to CDL.Tools.update() (cooldown + effect).
     3. Add any visuals to the draw* helpers.
     4. Add unlock + upgrade cards in upgrades.js.
     5. (Optional) add a display name to CDL.TOOL_META for the
        incident report kill-credit line.
   ============================================================ */

(function (CDL) {
  "use strict";

  const { dist2, clamp } = CDL;

  // Human-readable names (used by the post-run incident report).
  CDL.TOOL_META = {
    firewall: "Firewall Pulse",
    edr: "EDR Burst",
    siem: "SIEM Scanner",
    dns: "DNS Sinkhole Field",
    mfa: "MFA Shield",
    honeypot: "Honeypot Decoy",
    quarantine: "Quarantine Beam",
    backup: "Backup Restore",
  };

  // Default tool loadout. Player starts with Firewall Pulse only.
  CDL.freshTools = function () {
    return {
      firewall:   { owned: true,  level: 1, cd: 0, interval: 0.85, range: 92,  damage: 14, knockback: 220 },
      edr:        { owned: false, level: 0, cd: 0, interval: 0.75, damage: 13, projectiles: 1, pspeed: 480, range: 340 },
      siem:       { owned: false, level: 0, cd: 0, interval: 1.3,  radius: 120, damage: 9,  flash: 0 },
      dns:        { owned: false, level: 0, cd: 0, interval: 4.5,  duration: 3.2, radius: 95, slow: 0.45 },
      mfa:        { owned: false, level: 0, count: 2, radius: 58,  rotSpeed: 2.6, damage: 12, angle: 0 },
      honeypot:   { owned: false, level: 0, cd: 0, interval: 9,   duration: 4 },
      quarantine: { owned: false, level: 0, dps: 26, range: 270, target: null },
      backup:     { owned: false, level: 0, amount: 10 },
    };
  };

  CDL.Tools = {
    /* ---- Active-tool logic, run every frame while playing ---- */
    update(dt) {
      const S = CDL.S, p = S.player, t = p.tools;
      const feed = CDL.UI.feedMsg, dmg = CDL.damageEnemy, near = CDL.Enemies.nearest;

      // Firewall Pulse — periodic short-range AoE + knockback.
      if (t.firewall.owned) {
        t.firewall.cd -= dt;
        if (t.firewall.cd <= 0) {
          t.firewall.cd = t.firewall.interval;
          S.pulses.push({ x: p.x, y: p.y, r: 0, maxR: t.firewall.range, life: 0.32, maxLife: 0.32 });
          const rr = t.firewall.range * t.firewall.range;
          for (let i = S.enemies.length - 1; i >= 0; i--) {
            const e = S.enemies[i];
            if (dist2(e.x, e.y, p.x, p.y) <= rr) {
              const ang = Math.atan2(e.y - p.y, e.x - p.x);
              e.vx += Math.cos(ang) * t.firewall.knockback;
              e.vy += Math.sin(ang) * t.firewall.knockback;
              dmg(e, t.firewall.damage, "firewall");
            }
          }
        }
      }

      // EDR Burst — fire tracking projectiles at nearest threats.
      if (t.edr.owned) {
        t.edr.cd -= dt;
        if (t.edr.cd <= 0) {
          t.edr.cd = t.edr.interval;
          for (const e of near(t.edr.projectiles, t.edr.range)) {
            const ang = Math.atan2(e.y - p.y, e.x - p.x);
            S.projectiles.push({
              x: p.x, y: p.y,
              vx: Math.cos(ang) * t.edr.pspeed,
              vy: Math.sin(ang) * t.edr.pspeed,
              dmg: t.edr.damage, r: 5, life: 1.4,
            });
          }
        }
      }

      // SIEM Scanner — periodic ring scan + bonus telemetry.
      if (t.siem.owned) {
        t.siem.cd -= dt;
        if (t.siem.flash > 0) t.siem.flash -= dt;
        if (t.siem.cd <= 0) {
          t.siem.cd = t.siem.interval;
          t.siem.flash = 0.3;
          const rr = t.siem.radius * t.siem.radius;
          for (let i = S.enemies.length - 1; i >= 0; i--) {
            const e = S.enemies[i];
            if (dist2(e.x, e.y, p.x, p.y) <= rr) dmg(e, t.siem.damage, "siem");
          }
        }
      }

      // DNS Sinkhole — periodically drop a slowing field on a cluster.
      if (t.dns.owned) {
        t.dns.cd -= dt;
        if (t.dns.cd <= 0 && S.enemies.length) {
          t.dns.cd = t.dns.interval;
          const target = S.enemies[(Math.random() * S.enemies.length) | 0];
          S.fields.push({ x: target.x, y: target.y, r: t.dns.radius, slow: t.dns.slow, life: t.dns.duration, maxLife: t.dns.duration });
          feed("DNS Sinkhole slowing traffic.", "good", 5);
        }
      }

      // MFA Shield — rotating damage nodes.
      if (t.mfa.owned) {
        t.mfa.angle += t.mfa.rotSpeed * dt;
        const step = (Math.PI * 2) / t.mfa.count;
        for (let n = 0; n < t.mfa.count; n++) {
          const a = t.mfa.angle + step * n;
          const ox = p.x + Math.cos(a) * t.mfa.radius;
          const oy = p.y + Math.sin(a) * t.mfa.radius;
          for (let i = S.enemies.length - 1; i >= 0; i--) {
            const e = S.enemies[i];
            if (e.shieldCd > 0) continue;
            const rad = e.r + 9;
            if (dist2(e.x, e.y, ox, oy) <= rad * rad) {
              e.shieldCd = 0.35;
              const ang = Math.atan2(e.y - p.y, e.x - p.x);
              e.vx += Math.cos(ang) * 90;
              e.vy += Math.sin(ang) * 90;
              dmg(e, t.mfa.damage, "mfa");
            }
          }
        }
      }

      // Honeypot Decoy — periodically deploy a distraction.
      if (t.honeypot.owned) {
        t.honeypot.cd -= dt;
        if (t.honeypot.cd <= 0) {
          t.honeypot.cd = t.honeypot.interval;
          const a = Math.random() * Math.PI * 2;
          S.decoys.push({
            x: clamp(p.x + Math.cos(a) * 130, 20, CDL.W - 20),
            y: clamp(p.y + Math.sin(a) * 130, 20, CDL.H - 20),
            r: 12, life: t.honeypot.duration,
          });
          feed("Honeypot distracted attacker.", "good", 4);
        }
      }

      // Quarantine Beam — lock the closest threat, steady damage over time.
      if (t.quarantine.owned) {
        t.quarantine.target = null;
        const list = near(1, t.quarantine.range);
        if (list.length) {
          t.quarantine.target = list[0];
          dmg(list[0], t.quarantine.dps * dt, "quarantine");
        }
      }
    },

    /* ---- EDR projectiles ---- */
    updateProjectiles(dt) {
      const S = CDL.S;
      for (let i = S.projectiles.length - 1; i >= 0; i--) {
        const pr = S.projectiles[i];
        pr.x += pr.vx * dt; pr.y += pr.vy * dt; pr.life -= dt;
        let hit = false;
        if (pr.x < -20 || pr.x > CDL.W + 20 || pr.y < -20 || pr.y > CDL.H + 20) hit = true;
        else {
          for (const e of S.enemies) {
            const rad = e.r + pr.r;
            if (dist2(e.x, e.y, pr.x, pr.y) <= rad * rad) {
              let d = pr.dmg;
              if (e.type === "malware" || e.type === "ransomware") d *= 1.5; // EDR strong vs these
              CDL.damageEnemy(e, d, "edr");
              hit = true;
              break;
            }
          }
        }
        if (hit || pr.life <= 0) S.projectiles.splice(i, 1);
      }
    },

    /* ---- Transient visual effects: pulses + sinkhole field timers ---- */
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
    },

    /* ---- Rendering, split by z-layer (called from game.js render) ---- */

    // Below enemies: sinkhole fields + honeypot decoys.
    drawGround(ctx) {
      const S = CDL.S;
      for (const f of S.fields) {
        const a = 0.12 + 0.1 * (f.life / f.maxLife);
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(56,189,248," + a + ")"; ctx.fill();
        ctx.strokeStyle = "rgba(56,189,248,0.5)";
        ctx.setLineDash([6, 6]); ctx.stroke(); ctx.setLineDash([]);
      }
      for (const d of S.decoys) {
        const pulse = 1 + Math.sin(S.runTime * 8) * 0.12;
        ctx.beginPath(); ctx.arc(d.x, d.y, d.r * pulse, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(251,191,36,0.25)"; ctx.fill();
        ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = "#fbbf24"; ctx.font = "12px monospace"; ctx.textAlign = "center";
        ctx.fillText("🍯", d.x, d.y + 4);
      }
    },

    // Player-centred auras: SIEM ring + quarantine beam.
    drawAuras(ctx) {
      const S = CDL.S, p = S.player, t = p.tools;
      if (t.siem.owned) {
        ctx.beginPath(); ctx.arc(p.x, p.y, t.siem.radius, 0, Math.PI * 2);
        ctx.strokeStyle = t.siem.flash > 0 ? "rgba(34,211,238,0.85)" : "rgba(34,211,238,0.28)";
        ctx.lineWidth = t.siem.flash > 0 ? 3 : 1.5; ctx.stroke();
      }
      if (t.quarantine.owned && t.quarantine.target && S.enemies.indexOf(t.quarantine.target) !== -1) {
        ctx.beginPath(); ctx.moveTo(p.x, p.y);
        ctx.lineTo(t.quarantine.target.x, t.quarantine.target.y);
        ctx.strokeStyle = "rgba(56,189,248,0.85)"; ctx.lineWidth = 3;
        ctx.shadowColor = "#38bdf8"; ctx.shadowBlur = 12; ctx.stroke(); ctx.shadowBlur = 0;
      }
    },

    drawPulses(ctx) {
      for (const p of CDL.S.pulses) {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(56,189,248," + (p.life / p.maxLife) + ")";
        ctx.lineWidth = 4; ctx.stroke();
      }
    },

    // Above enemies: EDR projectiles + MFA shield nodes.
    drawOver(ctx) {
      const S = CDL.S, p = S.player, t = p.tools;
      for (const pr of S.projectiles) {
        ctx.beginPath(); ctx.arc(pr.x, pr.y, pr.r, 0, Math.PI * 2);
        ctx.fillStyle = "#7dd3fc"; ctx.shadowColor = "#38bdf8"; ctx.shadowBlur = 10;
        ctx.fill(); ctx.shadowBlur = 0;
      }
      if (t.mfa.owned) {
        const step = (Math.PI * 2) / t.mfa.count;
        for (let n = 0; n < t.mfa.count; n++) {
          const a = t.mfa.angle + step * n;
          const ox = p.x + Math.cos(a) * t.mfa.radius;
          const oy = p.y + Math.sin(a) * t.mfa.radius;
          ctx.beginPath(); ctx.arc(ox, oy, 7, 0, Math.PI * 2);
          ctx.fillStyle = "#a5f3fc"; ctx.shadowColor = "#22d3ee"; ctx.shadowBlur = 10;
          ctx.fill(); ctx.shadowBlur = 0;
        }
      }
    },
  };
})(window.CDL);
